import { prisma } from "../config/db.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getFileUrl } from "../utils/deleteFromS3.js";

export const getBrandsByTag = asyncHandler(async (req, res) => {
  const { tag } = req.query;
  if (!tag)
    return res.status(400).json({ success: false, message: "Tag is required" });
  const brands = await prisma.brand.findMany({
    where: { tags: { has: tag } },
    include: { products: true },
  });
  const data = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    image: b.image,
    tags: b.tags,
    productCount: b.products.length,
  }));
  res
    .status(200)
    .json(new ApiResponsive(200, { brands: data }, "Brands by tag fetched"));
});

export const getAllBrands = asyncHandler(async (req, res) => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: "asc" },
  });
  const data = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    image: b.image,
    logo: b.logo,
    productCount: 0, // Simplified for performance, can include count if needed
  }));
  res
    .status(200)
    .json(new ApiResponsive(200, { brands: data }, "All brands fetched"));
});

export const getBrandBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    search = "",
    category = "",
    color = "",
    size = "",
    minPrice,
    maxPrice,
    sort = "createdAt",
    order = "desc",
    page = 1,
    limit = 15,
  } = req.query;

  // Find the brand
  const brand = await prisma.brand.findUnique({
    where: { slug },
  });
  if (!brand)
    return res.status(404).json({ success: false, message: "Brand not found" });

  // Build filter conditions for products of this brand
  const whereConditions = {
    isActive: true,
    brandId: brand.id,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(category && {
      categories: {
        some: {
          category: {
            OR: [{ id: category }, { slug: category }],
          },
        },
      },
    }),
    ...((minPrice || maxPrice) && {
      variants: {
        some: {
          AND: [
            { isActive: true },
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
    ...(color && {
      variants: {
        some: {
          color: {
            OR: [
              { id: color },
              { name: { contains: color, mode: "insensitive" } },
            ],
          },
        },
      },
    }),
    ...(size && {
      variants: {
        some: {
          size: {
            OR: [
              { id: size },
              { name: { contains: size, mode: "insensitive" } },
            ],
          },
        },
      },
    }),
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
        include: { category: true },
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
          images: { orderBy: { order: "asc" } },
        },
        orderBy: { price: "asc" },
      },
      _count: {
        select: {
          reviews: { where: { status: "APPROVED" } },
          variants: true,
        },
      },
    },
    orderBy: [{ [sort]: order }],
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  });

  // Batch fetch active flash sales for products
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

  // Format products like in product.controller.js
  const formattedProducts = products.map((product) => {
    const primaryCategory =
      product.categories.length > 0 ? product.categories[0].category : null;
    let imageUrl = null;
    if (product.images && product.images.length > 0) {
      const primaryImage = product.images.find((img) => img.isPrimary);
      imageUrl = primaryImage ? primaryImage.url : product.images[0].url;
    } else if (product.variants && product.variants.length > 0) {
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

    // Calculate prices
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
      image: imageUrl ? imageUrl : null,
      variants: product.variants.map((variant) => ({
        ...variant,
        images: variant.images
          ? variant.images.map((image) => ({
            ...image,
            url: image.url,
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

  const formattedBrand = {
    ...brand,
    products: formattedProducts,
  };

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        brand: formattedBrand,
        pagination: {
          total: totalProducts,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalProducts / parseInt(limit)),
        },
      },
      "Brand by slug fetched"
    )
  );
});

// Get active flash sales (public)
export const getActiveFlashSales = asyncHandler(async (req, res) => {
  const now = new Date();

  // Get active flash sales that are currently running
  const flashSales = await prisma.flashSale.findMany({
    where: {
      isActive: true,
      startTime: { lte: now },
      endTime: { gte: now },
    },
    include: {
      products: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
              variants: {
                where: { isActive: true },
                include: {
                  images: {
                    orderBy: { order: "asc" },
                    take: 1,
                  },
                },
                orderBy: { price: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
  });

  // Format response
  const formattedFlashSales = flashSales.map((sale) => {
    // Calculate time remaining
    const timeRemaining = new Date(sale.endTime).getTime() - now.getTime();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    const minutesRemaining = Math.floor(
      (timeRemaining % (1000 * 60 * 60)) / (1000 * 60)
    );

    return {
      id: sale.id,
      name: sale.name,
      discountPercentage: sale.discountPercentage,
      startTime: sale.startTime,
      endTime: sale.endTime,
      timeRemaining: {
        hours: hoursRemaining,
        minutes: minutesRemaining,
        total: timeRemaining,
      },
      maxQuantity: sale.maxQuantity,
      soldCount: sale.soldCount,
      products: sale.products.map((fp) => {
        const variant = fp.product.variants[0];
        // Use salePrice if exists, otherwise use regular price
        const regularPrice = variant ? parseFloat(variant.price) : 0;
        const variantSalePrice = variant?.salePrice ? parseFloat(variant.salePrice) : null;
        const priceBeforeFlashSale = variantSalePrice || regularPrice;
        const discountAmount = (priceBeforeFlashSale * sale.discountPercentage) / 100;
        const flashSalePrice = priceBeforeFlashSale - discountAmount;

        // Get product image with fallback logic
        let imageUrl = null;

        // Priority 1: Product images
        if (fp.product.images && fp.product.images.length > 0) {
          const primaryImage = fp.product.images.find((img) => img.isPrimary);
          imageUrl = primaryImage ? primaryImage.url : fp.product.images[0].url;
        }
        // Priority 2: Variant images
        else if (variant && variant.images && variant.images.length > 0) {
          const primaryImage = variant.images.find((img) => img.isPrimary);
          imageUrl = primaryImage ? primaryImage.url : variant.images[0].url;
        }

        return {
          id: fp.product.id,
          name: fp.product.name,
          slug: fp.product.slug,
          image: imageUrl ? getFileUrl(imageUrl) : null,
          originalPrice: regularPrice,
          priceBeforeFlashSale,
          salePrice: Math.round(Math.max(0, flashSalePrice) * 100) / 100,
          discountPercentage: sale.discountPercentage,
          hasSale: variantSalePrice !== null,
        };
      }),
    };
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { flashSales: formattedFlashSales },
        "Active flash sales fetched successfully"
      )
    );
});

// Get active product sections (public)
export const getActiveProductSections = asyncHandler(async (req, res) => {
  const sections = await prisma.productSection.findMany({
    where: {
      isActive: true,
    },
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        where: {
          product: {
            isActive: true,
          },
        },
        include: {
          product: {
            include: {
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
                    take: 1,
                  },
                },
                orderBy: { price: "asc" },
                take: 1,
              },
              _count: {
                select: {
                  reviews: { where: { status: "APPROVED" } },
                },
              },
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  // Collect all product IDs and batch fetch flash sales
  const allProductIds = sections.flatMap(section =>
    section.items.map(item => item.product.id)
  );

  const now = new Date();
  const flashSaleProductsData = await prisma.flashSaleProduct.findMany({
    where: {
      productId: { in: allProductIds },
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
  flashSaleProductsData.forEach(fsp => {
    flashSaleMap[fsp.productId] = {
      isActive: true,
      flashSaleId: fsp.flashSale.id,
      name: fsp.flashSale.name,
      discountPercentage: fsp.flashSale.discountPercentage,
      endTime: fsp.flashSale.endTime,
    };
  });

  // Format sections with products
  const formattedSections = sections
    .filter((section) => section.items.length > 0)
    .map((section) => {
      const products = section.items.map((item) => {
        const product = item.product;
        const variant = product.variants[0];
        const image = product.images[0]?.url || variant?.images[0]?.url || null;

        // Calculate base and flash sale prices
        const basePrice = variant
          ? parseFloat(variant.salePrice || variant.price)
          : null;
        const regularPrice = variant ? parseFloat(variant.price) : null;
        const hasSale = variant?.salePrice !== null;

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
          description: product.description,
          image: image ? getFileUrl(image) : null,
          price: regularPrice,
          basePrice,
          salePrice: variant?.salePrice ? parseFloat(variant.salePrice) : null,
          regularPrice,
          hasSale,
          reviewCount: product._count.reviews,
          flashSale: flashSale ? {
            ...flashSale,
            flashSalePrice,
          } : null,
        };
      });

      return {
        id: section.id,
        name: section.name,
        slug: section.slug,
        description: section.description,
        icon: section.icon,
        color: section.color,
        displayOrder: section.displayOrder,
        maxProducts: section.maxProducts,
        products: products.slice(0, section.maxProducts),
      };
    });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { sections: formattedSections },
        "Active product sections fetched successfully"
      )
    );
});

// Get all attributes for filters (dynamic - includes all attributes)
export const getFilterAttributes = asyncHandler(async (req, res) => {
  // Fetch all attributes with their values
  const attributes = await prisma.attribute.findMany({
    include: {
      values: {
        orderBy: { value: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // Format attributes dynamically
  const formattedAttributes = attributes.map((attr) => {
    // Format values based on attribute type
    const formattedValues = attr.values.map((val) => {
      const baseValue = {
        id: val.id,
        name: val.value,
        value: val.value,
      };

      // Add hexCode for Color attributes
      if (attr.name.toLowerCase() === "color" && val.hexCode) {
        baseValue.hexCode = val.hexCode;
      }

      // Add image if available
      if (val.image) {
        baseValue.image = getFileUrl(val.image);
      }

      // Add display property for Size attributes
      if (attr.name.toLowerCase() === "size") {
        baseValue.display = val.value;
      }

      return baseValue;
    });

    return {
      id: attr.id,
      name: attr.name,
      inputType: attr.inputType,
      values: formattedValues,
    };
  });

  // For backward compatibility, also include colors and sizes separately
  const colorAttribute = attributes.find(
    (a) => a.name.toLowerCase() === "color"
  );
  const sizeAttribute = attributes.find((a) => a.name.toLowerCase() === "size");

  const colors = colorAttribute
    ? colorAttribute.values.map((val) => ({
      id: val.id,
      name: val.value,
      hexCode: val.hexCode || null,
      image: val.image ? getFileUrl(val.image) : null,
    }))
    : [];

  const sizes = sizeAttribute
    ? sizeAttribute.values.map((val) => ({
      id: val.id,
      name: val.value,
      display: val.value,
    }))
    : [];

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        attributes: formattedAttributes,
        colors,
        sizes,
      },
      "Filter attributes fetched successfully"
    )
  );
});

// Get price visibility settings for public access
export const getPriceVisibilitySettings = asyncHandler(async (req, res) => {
  // Get price visibility settings (singleton)
  let priceVisibilitySettings = await prisma.priceVisibilitySetting.findFirst();

  // If no settings exist, create default ones
  if (!priceVisibilitySettings) {
    priceVisibilitySettings = await prisma.priceVisibilitySetting.create({
      data: {
        hidePricesForGuests: false,
        isActive: true,
      },
    });
  }

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        hidePricesForGuests: priceVisibilitySettings.hidePricesForGuests,
        isActive: priceVisibilitySettings.isActive,
      },
      "Price visibility settings fetched successfully"
    )
  );
});
