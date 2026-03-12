import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import { formatVariantWithAttributes } from "../utils/variant-attributes.js";

// Get all products with filtering, pagination and sorting
export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category = "",
    sort = "createdAt",
    order = "desc",
    minPrice,
    maxPrice,
    featured,
    bestseller,
    trending,
    newArrival,
    productType,
    ourProduct,
    color, // For backward compatibility
    size, // For backward compatibility
    attributeValueIds, // Comma-separated attribute value IDs for filtering
  } = req.query;

  // Normalize search: treat + as space (when querystrings use + for spaces)
  const normalizedSearch =
    typeof search === "string" ? search.replace(/\+/g, " ") : "";

  // Build productType conditions based on individual flags
  const productTypeConditions = [];
  if (bestseller === "true") productTypeConditions.push("bestseller");
  if (trending === "true") productTypeConditions.push("trending");
  // Map newArrival query param to "new" stored value
  if (newArrival === "true") productTypeConditions.push("new");

  if (productType) {
    // productType param can be a single string or comma-separated
    const types = productType.split(",");
    types.forEach(t => {
      if (t === "newArrival") productTypeConditions.push("new");
      else productTypeConditions.push(t);
    });
  }

  // Build filter conditions
  const whereConditions = {
    isActive: true, // Only show active products
    // Search in name or description
    ...(normalizedSearch && {
      OR: [
        { name: { contains: normalizedSearch, mode: "insensitive" } },
        { description: { contains: normalizedSearch, mode: "insensitive" } },
        // Also allow searching by category name or slug
        {
          categories: {
            some: {
              category: {
                OR: [
                  { name: { contains: normalizedSearch, mode: "insensitive" } },
                  { slug: { contains: normalizedSearch, mode: "insensitive" } },
                ],
              },
            },
          },
        },
        // Also allow searching by brand name
        {
          brand: {
            name: { contains: normalizedSearch, mode: "insensitive" },
          },
        },
      ],
    }),
    // Filter by category
    ...(category && {
      categories: {
        some: {
          category: {
            OR: [{ id: category }, { slug: category }],
          },
        },
      },
    }),
    // Filter by featured
    ...(featured === "true" && {
      OR: [
        { featured: true },
        { productType: { array_contains: ["featured"] } }
      ]
    }),
    // Filter by ourProduct
    ...(ourProduct === "true" && {
      ourProduct: true,
    }),
    // Filter by product types (bestseller, trending, new, etc.)
    ...(productTypeConditions.length > 0 && {
      productType: {
        array_contains: productTypeConditions,
      },
    }),
    // Filter by price range via variants
    ...((minPrice || maxPrice) && {
      variants: {
        some: {
          AND: [
            { isActive: true },
            // Min price
            ...(minPrice
              ? [
                {
                  OR: [
                    { price: { gte: parseFloat(minPrice) } },
                    {
                      AND: [
                        { salePrice: { not: null } },
                        { salePrice: { gte: parseFloat(minPrice) } },
                      ],
                    },
                  ],
                },
              ]
              : []),
            // Max price
            ...(maxPrice
              ? [
                {
                  OR: [
                    {
                      AND: [
                        { salePrice: { not: null } },
                        { salePrice: { lte: parseFloat(maxPrice) } },
                      ],
                    },
                    {
                      AND: [
                        { salePrice: null },
                        { price: { lte: parseFloat(maxPrice) } },
                      ],
                    },
                  ],
                },
              ]
              : []),
          ],
        },
      },
    }),
    // Filter by attribute values (dynamic - supports all attributes)
    // Collect all attribute value IDs
    ...((() => {
      const allAttributeValueIds = [];

      // Add color and size if provided (backward compatibility)
      if (color) allAttributeValueIds.push(color);
      if (size) allAttributeValueIds.push(size);

      // Add all attribute value IDs from attributeValueIds parameter
      if (attributeValueIds) {
        const valueIds = attributeValueIds.split(",").map((id) => id.trim()).filter(Boolean);
        allAttributeValueIds.push(...valueIds);
      }

      // Remove duplicates
      const uniqueAttributeValueIds = [...new Set(allAttributeValueIds)];

      if (uniqueAttributeValueIds.length === 0) return {};

      // Filter: product must have at least one variant with ALL selected attribute values
      return {
        variants: {
          some: {
            AND: [
              { isActive: true },
              // Variant must have ALL selected attribute values
              // Each attribute value ID must be present in variant's attributes
              ...uniqueAttributeValueIds.map((valueId) => ({
                attributes: {
                  some: {
                    attributeValueId: valueId,
                  },
                },
              })),
            ],
          },
        },
      };
    })()),
  };

  // Get total count for pagination
  const totalProducts = await prisma.product.count({
    where: whereConditions,
  });

  // Get products with pagination, sorting
  const products = await prisma.product.findMany({
    where: whereConditions,
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      variants: {
        where: { isActive: true },
        include: {
          attributes: {
            include: {
              attributeValue: {
                include: {
                  attribute: true,
                },
              },
            },
          },
          images: {
            orderBy: { order: "asc" }, // Sort images by order (0, 1, 2, 3...)
          },
        },
        orderBy: { price: "asc" },
      },
      _count: {
        select: {
          reviews: {
            where: {
              status: "APPROVED",
            },
          },
          variants: true,
        },
      },
    },
    orderBy: [
      sort === "newest"
        ? { createdAt: order }
        : { [sort]: order }
    ],
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  });

  // Batch fetch active flash sales for all products in this result
  const now = new Date();
  const productIds = products.map(p => p.id);

  const flashSaleProducts = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: productIds },
      flashSale: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
    include: {
      flashSale: {
        select: {
          id: true,
          name: true,
          discountPercentage: true,
          endTime: true,
        },
      },
    },
  });

  // Create a map of productId -> flashSale data for quick lookup
  const flashSaleMap = {};
  flashSaleProducts.forEach(fsp => {
    flashSaleMap[fsp.productId] = {
      isActive: true,
      flashSaleId: fsp.flashSale.id,
      name: fsp.flashSale.name,
      discountPercentage: fsp.flashSale.discountPercentage,
      endTime: fsp.flashSale.endTime,
    };
  });

  // Format products for response
  const formattedProducts = products.map((product) => {
    // Get primary category (first in the list)
    const primaryCategory =
      product.categories.length > 0 ? product.categories[0].category : null;

    // Get image with fallback logic
    let imageUrl = null;

    // Priority 1: Product images
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img) => img.isPrimary);
      imageUrl = primaryImage ? primaryImage.url : product.images[0].url;
    }
    // Priority 2: Any variant images
    else if (product.variants && product.variants.length > 0) {
      const variantWithImages = product.variants.find(
        (variant) => variant.images && variant.images.length > 0
      );
      if (variantWithImages) {
        const primaryImage = variantWithImages.images.find(
          (img) => img.isPrimary
        );
        imageUrl = primaryImage
          ? primaryImage.url
          : variantWithImages.images[0].url;
      }
    }

    // Calculate base price (sale price if exists, otherwise regular price)
    const basePrice = product.variants.length > 0
      ? parseFloat(product.variants[0].salePrice || product.variants[0].price)
      : null;
    const regularPrice = product.variants.length > 0
      ? parseFloat(product.variants[0].price)
      : null;
    const hasSale = product.variants.length > 0 && product.variants[0].salePrice !== null;

    // Get flash sale data for this product
    const flashSale = flashSaleMap[product.id] || null;

    // Calculate flash sale price if applicable
    let flashSalePrice = null;
    if (flashSale && basePrice !== null) {
      const discountAmount = (basePrice * flashSale.discountPercentage) / 100;
      flashSalePrice = Math.round((basePrice - discountAmount) * 100) / 100; // Round to 2 decimals
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      featured: product.featured,
      description: product.description,
      category: primaryCategory
        ? {
          id: primaryCategory.id,
          name: primaryCategory.name,
          slug: primaryCategory.slug,
        }
        : null,
      image: imageUrl ? getFileUrl(imageUrl) : null,
      // Add variants for frontend fallback
      variants: product.variants.map((variant) => ({
        ...variant,
        images: variant.images
          ? variant.images.map((image) => ({
            ...image,
            url: getFileUrl(image.url),
          }))
          : [],
      })),
      basePrice,
      hasSale,
      regularPrice,
      variantCount: product._count.variants,
      reviewCount: product._count.reviews,
      // Flash sale data
      flashSale: flashSale ? {
        ...flashSale,
        flashSalePrice,
      } : null,
    };
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        products: formattedProducts,
        pagination: {
          total: totalProducts,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalProducts / parseInt(limit)),
        },
      },
      "Products fetched successfully"
    )
  );
});

// Get product details by slug
export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params; // Fetch product
  const product = await prisma.product.findFirst({
    where: {
      slug,
      isActive: true, // Only fetch active products
    },
    include: {
      images: {
        orderBy: { order: "asc" },
      },
      categories: {
        include: {
          category: true,
        },
      },
      subCategories: {
        include: {
          subCategory: true,
        },
      },
      variants: {
        where: { isActive: true }, // Only fetch active variants
        include: {
          attributes: {
            include: {
              attributeValue: {
                include: {
                  attribute: true
                }
              }
            }
          },
          images: {
            orderBy: { order: "asc" }, // Sort images by order (0, 1, 2, 3...)
          },
        }
      },
      reviews: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      },
      brand: true,
      pricingSlabs: {
        orderBy: { minQty: "asc" },
      },
      moqSettings: true,
      // Include variant group if this product is part of one
      variantGroupItems: {
        include: {
          variantGroup: {
            include: {
              items: {
                orderBy: { order: 'asc' },
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      images: {
                        where: { isPrimary: true },
                        take: 1
                      },
                      isActive: true,
                      variants: {
                        where: { isActive: true },
                        take: 1,
                        select: {
                          price: true,
                          salePrice: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      _count: {
        select: {
          reviews: {
            where: {
              status: "APPROVED",
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Get the category ID from the product's categories
  const categoryId =
    product.categories.length > 0 ? product.categories[0].category.id : null;

  // Format the response
  const formattedProduct = {
    ...product,
    // Add primary category
    category:
      product.categories.length > 0 ? product.categories[0].category : null,
    // Include brand (only select basic fields)
    brand: product.brand
      ? {
        id: product.brand.id,
        name: product.brand.name,
        slug: product.brand.slug,
      }
      : null,
    images: product.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    })),
    // Format variants with proper image URLs and attributes
    variants: await Promise.all(
      product.variants.map(async (variant) => {
        const formatted = formatVariantWithAttributes(variant);

        // Get effective MOQ for this variant
        let effectiveMOQ = 1;
        let moqSource = "DEFAULT";

        // Check variant MOQ
        const variantMOQ = await prisma.mOQSetting.findFirst({
          where: {
            scope: "VARIANT",
            variantId: variant.id,
            isActive: true,
          },
        });

        if (variantMOQ) {
          effectiveMOQ = variantMOQ.minQuantity;
          moqSource = "VARIANT";
        } else {
          // Check product MOQ
          const productMOQ = await prisma.mOQSetting.findFirst({
            where: {
              scope: "PRODUCT",
              productId: variant.productId,
              isActive: true,
            },
          });

          if (productMOQ) {
            effectiveMOQ = productMOQ.minQuantity;
            moqSource = "PRODUCT";
          } else {
            // Check global MOQ
            const globalMOQ = await prisma.mOQSetting.findFirst({
              where: {
                scope: "GLOBAL",
                isActive: true,
              },
            });

            if (globalMOQ) {
              effectiveMOQ = globalMOQ.minQuantity;
              moqSource = "GLOBAL";
            }
          }
        }

        // Get pricing slabs for this variant
        const variantSlabs = await prisma.pricingSlab.findMany({
          where: {
            variantId: variant.id,
          },
          orderBy: {
            minQty: "asc",
          },
        });

        // Get product-level pricing slabs
        const productSlabs = await prisma.pricingSlab.findMany({
          where: {
            productId: variant.productId,
            variantId: null,
          },
          orderBy: {
            minQty: "asc",
          },
        });

        // Combine slabs (variant slabs override product slabs)
        const allSlabs = [...variantSlabs, ...productSlabs].sort((a, b) => a.minQty - b.minQty);

        return {
          ...formatted,
          images: variant.images
            ? variant.images.map((image) => ({
              ...image,
              url: getFileUrl(image.url),
            }))
            : [],
          stock: variant.quantity, // Use quantity as stock
          moq: effectiveMOQ,
          moqSource,
          pricingSlabs: allSlabs.map((slab) => ({
            id: slab.id,
            minQty: slab.minQty,
            maxQty: slab.maxQty,
            price: parseFloat(slab.price),
          })),
          // Include shipping dimensions
          shippingLength: variant.shippingLength,
          shippingBreadth: variant.shippingBreadth,
          shippingHeight: variant.shippingHeight,
          shippingWeight: variant.shippingWeight,
        };
      })
    ),
    // Group variants by attributes - create dynamic attribute options
    attributeOptions: (() => {
      const attributeMap = new Map();

      product.variants.forEach((variant) => {
        variant.attributes?.forEach((vav) => {
          const attr = vav.attributeValue.attribute;
          const attrValue = vav.attributeValue;

          if (!attributeMap.has(attr.id)) {
            attributeMap.set(attr.id, {
              id: attr.id,
              name: attr.name,
              inputType: attr.inputType,
              values: new Map(),
            });
          }

          const attrData = attributeMap.get(attr.id);
          if (!attrData.values.has(attrValue.id)) {
            attrData.values.set(attrValue.id, {
              id: attrValue.id,
              value: attrValue.value,
            });
          }
        });
      });

      // Convert to array format
      return Array.from(attributeMap.values()).map((attr) => ({
        ...attr,
        values: Array.from(attr.values.values()),
      }));
    })(),
    // Average rating
    avgRating:
      product.reviews.length > 0
        ? (
          product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          product.reviews.length
        ).toFixed(1)
        : null,
    reviewCount: product._count.reviews,
    // Include SEO fields
    metaTitle: product.metaTitle || product.name,
    metaDescription: product.metaDescription || product.description,
    keywords: product.keywords || "",
    // Add price fields for fallback when no variant is selected
    // Priority: variants[0].salePrice (if exists) > variants[0].price
    basePrice:
      product.variants.length > 0
        ? parseFloat(product.variants[0].salePrice || product.variants[0].price || 0)
        : 0,
    hasSale:
      product.variants.length > 0 &&
      product.variants[0].salePrice !== null &&
      product.variants[0].salePrice !== undefined &&
      parseFloat(product.variants[0].salePrice) < parseFloat(product.variants[0].price),
    regularPrice:
      product.variants.length > 0
        ? parseFloat(product.variants[0].price || 0)
        : 0,

    // Format Variant Group (Linked products)
    variantGroup: product.variantGroupItems?.[0]?.variantGroup ? {
      id: product.variantGroupItems[0].variantGroup.id,
      name: product.variantGroupItems[0].variantGroup.name,
      type: product.variantGroupItems[0].variantGroup.type || "Color",
      items: (product.variantGroupItems[0].variantGroup.items || []).map(item => ({
        id: item.id,
        productId: item.productId,
        label: item.label,
        order: item.order,
        isDefault: item.isDefault,
        product: item.product ? {
          id: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          images: (item.product.images || []).map(img => ({
            id: img.id,
            url: getFileUrl(img.url),
            isPrimary: img.isPrimary
          })),
          price: item.product.variants?.[0]?.price || 0,
          salePrice: item.product.variants?.[0]?.salePrice || null
        } : null
      }))
    } : null,
  };

  // Remove raw relation items that are now formatted
  delete formattedProduct.variantGroupItems;

  // Fetch flash sale for this product
  const now = new Date();
  const flashSaleProduct = await prisma.flashSaleProduct.findFirst({
    where: {
      productId: product.id,
      flashSale: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
    include: {
      flashSale: {
        select: {
          id: true,
          name: true,
          discountPercentage: true,
          endTime: true,
        },
      },
    },
  });

  // Add flash sale to formattedProduct if exists
  if (flashSaleProduct) {
    const basePrice = formattedProduct.basePrice;
    const discountAmount = (basePrice * flashSaleProduct.flashSale.discountPercentage) / 100;
    const flashSalePrice = Math.round((basePrice - discountAmount) * 100) / 100;

    formattedProduct.flashSale = {
      isActive: true,
      flashSaleId: flashSaleProduct.flashSale.id,
      name: flashSaleProduct.flashSale.name,
      discountPercentage: flashSaleProduct.flashSale.discountPercentage,
      endTime: flashSaleProduct.flashSale.endTime,
      flashSalePrice,
    };
  } else {
    formattedProduct.flashSale = null;
  }

  // Add related products
  const relatedProducts = categoryId
    ? await prisma.product.findMany({
      where: {
        categories: {
          some: {
            category: {
              id: categoryId,
            },
          },
        },
        isActive: true,
        id: { not: product.id },
      },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          take: 1,
          include: {
            attributes: {
              include: {
                attributeValue: {
                  include: {
                    attribute: true,
                  },
                },
              },
            },
            images: true,
          },
        },
        _count: {
          select: {
            reviews: {
              where: {
                status: "APPROVED",
              },
            },
          },
        },
      },
      take: 4,
    })
    : [];

  const formattedRelated = relatedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: p.images[0] ? getFileUrl(p.images[0].url) : null,
    basePrice:
      p.variants.length > 0
        ? parseFloat(p.variants[0].salePrice || p.variants[0].price)
        : null,
    hasSale: p.variants.length > 0 && p.variants[0].salePrice !== null,
    regularPrice:
      p.variants.length > 0 ? parseFloat(p.variants[0].price) : null,
    reviewCount: p._count.reviews,
    variants: p.variants.map((variant) => ({
      ...variant,
      attributes: formatVariantWithAttributes(variant).attributes,
      images: variant.images
        ? variant.images.map((image) => ({
          ...image,
          url: getFileUrl(image.url),
        }))
        : [],
    })),
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        product: formattedProduct,
        relatedProducts: formattedRelated,
      },
      "Product fetched successfully"
    )
  );
});

// Get product variant details by attribute value IDs
export const getProductVariant = asyncHandler(async (req, res) => {
  const { productId, attributeValueIds } = req.query;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Parse attributeValueIds if provided as string or array
  let attributeValueIdsArray = [];
  if (attributeValueIds) {
    if (Array.isArray(attributeValueIds)) {
      attributeValueIdsArray = attributeValueIds;
    } else if (typeof attributeValueIds === "string") {
      attributeValueIdsArray = attributeValueIds.split(",").filter(Boolean);
    }
  }

  // Build query to find variant with matching attributes
  // A variant matches if it has ALL the specified attributeValueIds
  const variant = await prisma.productVariant.findFirst({
    where: {
      productId,
      isActive: true,
      ...(attributeValueIdsArray.length > 0 && {
        AND: attributeValueIdsArray.map((attrValueId) => ({
          attributes: {
            some: {
              attributeValueId: attrValueId,
            },
          },
        })),
      }),
    },
    include: {
      attributes: {
        include: {
          attributeValue: {
            include: {
              attribute: true,
            },
          },
        },
      },
      images: true,
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Format the variant response with attributes
  const formattedVariant = formatVariantWithAttributes(variant);
  formattedVariant.images = variant.images
    ? variant.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    }))
    : [];

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variant: formattedVariant },
        "Product variant fetched successfully"
      )
    );
});

// Get product variant by ID
export const getProductVariantById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Variant ID is required");
  }

  const variant = await prisma.productVariant.findFirst({
    where: {
      id: id,
      isActive: true,
    },
    include: {
      attributes: {
        include: {
          attributeValue: {
            include: {
              attribute: true,
            },
          },
        },
      },
      images: true,
      product: {
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Format the variant response with attributes
  const formattedVariant = formatVariantWithAttributes(variant);
  formattedVariant.images = variant.images
    ? variant.images.map((image) => ({
      ...image,
      url: getFileUrl(image.url),
    }))
    : [];
  formattedVariant.product = {
    ...variant.product,
    image: variant.product.images?.[0]?.url
      ? getFileUrl(variant.product.images[0].url)
      : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variant: formattedVariant },
        "Product variant fetched successfully"
      )
    );
});

// Get maximum product price for price range slider
export const getMaxPrice = asyncHandler(async (req, res) => {
  // Find the highest priced active variant
  const highestPriceVariant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      product: {
        isActive: true,
      },
    },
    orderBy: {
      price: "desc",
    },
  });

  // If no variants found, return a default max price
  const maxPrice = highestPriceVariant
    ? parseFloat(highestPriceVariant.price)
    : 1000;

  res
    .status(200)
    .json(
      new ApiResponsive(200, { maxPrice }, "Maximum price fetched successfully")
    );
});

// Get products by type (featured, bestseller, trending, new, etc.)
export const getProductsByType = asyncHandler(async (req, res) => {
  const { productType } = req.params;
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions for product type
  const filterConditions = {
    isActive: true,
    productType: {
      array_contains: [productType],
    },
  };

  // Get total count for pagination
  const totalProducts = await prisma.product.count({
    where: filterConditions,
  });

  // Get products with sorting
  const products = await prisma.product.findMany({
    where: filterConditions,
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      variants: {
        where: { isActive: true },
        include: {
          attributes: {
            include: {
              attributeValue: {
                include: {
                  attribute: true,
                },
              },
            },
          },
          images: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { price: "asc" },
      },
      _count: {
        select: {
          reviews: {
            where: {
              status: "APPROVED",
            },
          },
          variants: true,
        },
      },
    },
    orderBy: [{ [sort]: order }],
    skip,
    take: parseInt(limit),
  });

  // Batch fetch active flash sales for these products
  const now = new Date();
  const productIds = products.map(p => p.id);

  const flashSaleProducts = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: productIds },
      flashSale: {
        isActive: true,
        startTime: { lte: now },
        endTime: { gte: now },
      },
    },
    include: {
      flashSale: {
        select: {
          id: true,
          name: true,
          discountPercentage: true,
          endTime: true,
        },
      },
    },
  });

  // Create flash sale map
  const flashSaleMap = {};
  flashSaleProducts.forEach(fsp => {
    flashSaleMap[fsp.productId] = {
      isActive: true,
      flashSaleId: fsp.flashSale.id,
      name: fsp.flashSale.name,
      discountPercentage: fsp.flashSale.discountPercentage,
      endTime: fsp.flashSale.endTime,
    };
  });

  // Format the response data
  const formattedProducts = products.map((product) => {
    // Get primary category
    const primaryCategory =
      product.categories.length > 0 ? product.categories[0].category : null;

    // Get image with fallback logic
    let imageUrl = null;

    // Priority 1: Product images
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img) => img.isPrimary);
      imageUrl = primaryImage ? primaryImage.url : product.images[0].url;
    }
    // Priority 2: Any variant images
    else if (product.variants && product.variants.length > 0) {
      const variantWithImages = product.variants.find(
        (variant) => variant.images && variant.images.length > 0
      );
      if (variantWithImages) {
        const primaryImage = variantWithImages.images.find(
          (img) => img.isPrimary
        );
        imageUrl = primaryImage
          ? primaryImage.url
          : variantWithImages.images[0].url;
      }
    }

    // Calculate base price
    const basePrice = product.variants.length > 0
      ? parseFloat(product.variants[0].salePrice || product.variants[0].price)
      : null;
    const regularPrice = product.variants.length > 0
      ? parseFloat(product.variants[0].price)
      : null;
    const hasSale = product.variants.length > 0 && product.variants[0].salePrice !== null;

    // Get flash sale data
    const flashSale = flashSaleMap[product.id] || null;
    let flashSalePrice = null;
    if (flashSale && basePrice !== null) {
      const discountAmount = (basePrice * flashSale.discountPercentage) / 100;
      flashSalePrice = Math.round((basePrice - discountAmount) * 100) / 100;
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      featured: product.featured,
      description: product.description,
      category: primaryCategory
        ? {
          id: primaryCategory.id,
          name: primaryCategory.name,
          slug: primaryCategory.slug,
        }
        : null,
      image: imageUrl ? getFileUrl(imageUrl) : null,
      // Add variants for frontend fallback
      variants: product.variants.map((variant) => ({
        ...variant,
        images: variant.images
          ? variant.images.map((image) => ({
            ...image,
            url: getFileUrl(image.url),
          }))
          : [],
      })),
      basePrice,
      hasSale,
      regularPrice,
      variantCount: product._count.variants,
      reviewCount: product._count.reviews,
      flashSale: flashSale ? {
        ...flashSale,
        flashSalePrice,
      } : null,
    };
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        products: formattedProducts,
        pagination: {
          total: totalProducts,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalProducts / parseInt(limit)),
        },
      },
      `${productType} products fetched successfully`
    )
  );
});
