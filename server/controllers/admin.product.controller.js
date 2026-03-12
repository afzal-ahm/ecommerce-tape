import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";
import { createSlug } from "../helper/Slug.js";
import { generateSKU } from "../utils/generateSKU.js";
import {
  formatVariantWithAttributes,
  formatVariantsWithAttributes,
} from "../utils/variant-attributes.js";

// Get products by type (featured, bestseller, trending, new, etc.)
export const getProductsByType = asyncHandler(async (req, res, next) => {
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
        orderBy: { order: "asc" },
      },
      variants: {
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
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: [{ ourProduct: "desc" }, { [sort]: order }],
    skip,
    take: parseInt(limit),
  });

  // Format the response data
  const formattedProducts = products.map((product) => {
    // Add image URLs and clean up the data
    return {
      ...product,
      // Extract categories into a more usable format
      categories: product.categories.map((pc) => ({
        id: pc.category.id,
        name: pc.category.name,
        description: pc.category.description,
        image: pc.category.image ? getFileUrl(pc.category.image) : null,
        slug: pc.category.slug,
        isPrimary: pc.isPrimary,
      })),
      primaryCategory:
        product.categories.find((pc) => pc.isPrimary)?.category ||
        (product.categories.length > 0 ? product.categories[0].category : null),
      images: product.images.map((image) => ({
        ...image,
        url: getFileUrl(image.url),
      })),
      variants: product.variants.map((variant) => ({
        ...variant,
        color: variant.color
          ? {
            ...variant.color,
            image: variant.color.image
              ? getFileUrl(variant.color.image)
              : null,
          }
          : null,
        size: variant.size ? variant.size : null,
        images: variant.images
          ? variant.images
            .sort((a, b) => a.order - b.order)
            .map((image) => ({
              ...image,
              url: getFileUrl(image.url),
            }))
          : [],
      })),
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

// Get all products with pagination, filtering, and sorting
export const getProducts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category = "",
    sort = "createdAt",
    order = "desc",
    featured,
    isActive,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions
  const filterConditions = {
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
    ...(featured !== undefined && { featured: featured === "true" }),
    ...(isActive !== undefined && { isActive: isActive === "true" }),
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
        orderBy: { order: "asc" },
      },
      variants: {
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
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: [{ ourProduct: "desc" }, { [sort]: order }],
    skip,
    take: parseInt(limit),
  });

  // Format the response data
  const formattedProducts = products.map((product) => {
    try {
      const {
        categories: rawCategories,
        images: rawImages,
        variants: rawVariants,
        _count,
        ...productData
      } = product;

      return {
        ...productData,
        categories: (rawCategories || []).map((pc) => ({
          id: pc.category?.id,
          name: pc.category?.name,
          slug: pc.category?.slug,
          isPrimary: pc.isPrimary,
        })),
        primaryCategory:
          (rawCategories || []).find((pc) => pc.isPrimary)?.category ||
          (rawCategories && rawCategories.length > 0 ? rawCategories[0].category : null),
        images: (rawImages || []).map((image) => ({
          ...image,
          url: getFileUrl(image.url),
        })),
        variants: (rawVariants || []).map((variant) => {
          const formatted = formatVariantWithAttributes(variant);
          return {
            ...formatted,
            images: (variant.images || []).map((image) => ({
              ...image,
              url: getFileUrl(image.url),
            })),
          };
        }),
        reviewCount: _count?.reviews || 0,
      };
    } catch (err) {
      console.error(`[ERROR] Formatting product ${product.id}:`, err);
      return {
        ...product,
        error: 'Formatting error',
        categories: [],
        images: [],
        variants: []
      };
    }
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

// Get product details by ID
export const getProductById = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      images: {
        orderBy: { order: "asc" },
      },
      variants: {
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
      },
      reviews: {
        where: { status: "APPROVED" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      variantGroupItems: {
        include: {
          variantGroup: {
            include: {
              items: {
                include: {
                  product: {
                    include: {
                      images: {
                        orderBy: { order: "asc" },
                      },
                    },
                  },
                },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Format the response data
  try {
    const {
      categories: rawCategories,
      images: rawImages,
      variants: rawVariants,
      variantGroupItems: rawVGItems,
      ...productData
    } = product;

    const formattedProduct = {
      ...productData,
      // Fix nested tags if they exist
      tags: Array.isArray(product.tags)
        ? product.tags.flatMap(t => {
          try {
            let current = t;
            // Clean up potentially multiple layers of stringification
            while (typeof current === 'string' && (current.startsWith('[') || current.startsWith('"['))) {
              const baba = JSON.parse(current);
              if (baba === current) break;
              current = baba;
            }
            return Array.isArray(current) ? current : [current];
          } catch (e) {
            return [t];
          }
        }).filter(t => t && t !== '[]' && t !== '')
        : [],
      // 2. Format categories
      categories: (rawCategories || []).map((pc) => ({
        id: pc.category?.id,
        name: pc.category?.name,
        description: pc.category?.description,
        image: pc.category?.image ? getFileUrl(pc.category.image) : null,
        slug: pc.category?.slug,
        isPrimary: pc.isPrimary,
      })),
      primaryCategory:
        (rawCategories || []).find((pc) => pc.isPrimary)?.category ||
        (rawCategories && rawCategories.length > 0 ? rawCategories[0].category : null),

      // 3. Format primary images
      images: (rawImages || []).map((image) => ({
        ...image,
        url: getFileUrl(image.url),
      })),

      // 4. Format variations
      variants: (rawVariants || []).map((variant) => {
        const formatted = formatVariantWithAttributes(variant);
        return {
          ...formatted,
          images: (variant.images || []).map((image) => ({
            ...image,
            url: getFileUrl(image.url),
          })),
        };
      }),

      // 5. Format Variant Group (Linked products)
      variantGroup: rawVGItems?.[0]?.variantGroup ? {
        id: rawVGItems[0].variantGroup.id,
        name: rawVGItems[0].variantGroup.name,
        type: rawVGItems[0].variantGroup.type || "Color",
        items: (rawVGItems[0].variantGroup.items || []).map(item => ({
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
            }))
          } : null
        }))
      } : null,

      // 6. Include SEO fields
      metaTitle: product.metaTitle || product.name,
      metaDescription: product.metaDescription || product.description,
      keywords: product.keywords || "",
    };

    res.status(200).json(
      new ApiResponsive(
        200,
        { product: formattedProduct },
        "Product fetched successfully"
      )
    );
  } catch (error) {
    console.error(`[CRITICAL ERROR] getProductById formatting failed:`, error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error in formatting product details",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
});

// Create a new product
export const createProduct = asyncHandler(async (req, res, next) => {
  // Initialize variantIdsWithOrders for new product creation (empty since no existing variants)
  let variantIdsWithOrders = [];

  // Check if body is completely empty
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "Product data is missing. Empty request received.");
  }

  const {
    name,
    description,
    categoryIds,
    primaryCategoryId,
    featured,
    productType,
    isActive,
    hasVariants,
    variants: variantsJson,
    metaTitle,
    metaDescription,
    keywords,
    ourProduct,
  } = req.body;

  // Validation checks with better error handling
  if (
    !name ||
    name.trim() === "" ||
    name.includes('{"success":false,"message"')
  ) {
    throw new ApiError(
      400,
      "Valid product name is required. Please provide a proper name without error messages."
    );
  }

  // Clean the name to remove any potential error messages
  const cleanName = name.includes('{"success":false,"message"')
    ? "New Product"
    : name.trim();

  // Parse category IDs
  let parsedCategoryIds = [];
  try {
    // Handle both string JSON and array formats
    if (categoryIds) {
      if (Array.isArray(categoryIds)) {
        parsedCategoryIds = categoryIds;
      } else {
        parsedCategoryIds = JSON.parse(categoryIds);
      }
    }

    // If no categories were provided, find or create the default 'Uncategorized' category
    if (!Array.isArray(parsedCategoryIds) || parsedCategoryIds.length === 0) {
      // Try to find the Uncategorized category
      let defaultCategory = await prisma.category.findFirst({
        where: { name: "Uncategorized" },
      });

      // If it doesn't exist, create it
      if (!defaultCategory) {
        const slug = "uncategorized";
        defaultCategory = await prisma.category.create({
          data: {
            name: "Uncategorized",
            slug,
            description:
              "DEFAULT_CATEGORY - Products without a specific category",
          },
        });
      }

      parsedCategoryIds = [defaultCategory.id];
    }
  } catch (error) {
    console.error("Error parsing categoryIds:", error, categoryIds);
    throw new ApiError(400, "Invalid categories format");
  }

  // Set primary category if not provided
  const primaryCategory = primaryCategoryId || parsedCategoryIds[0];

  // Check if all categories exist
  for (const catId of parsedCategoryIds) {
    const category = await prisma.category.findUnique({
      where: { id: catId },
    });

    if (!category) {
      throw new ApiError(404, `Category with ID ${catId} not found`);
    }
  }

  // Generate slug from name
  const slug = createSlug(cleanName);

  // Check if slug already exists
  const existingProduct = await prisma.product.findUnique({
    where: { slug },
  });

  if (existingProduct) {
    throw new ApiError(409, "Product with similar name already exists");
  }

  // Create the product with transaction to ensure variants are created as well
  try {
    const result = await prisma.$transaction(async (prisma) => {
      // Create the product
      // Parse productType if provided
      let parsedProductType = [];
      if (productType) {
        try {
          parsedProductType =
            typeof productType === "string"
              ? JSON.parse(productType)
              : productType;
          if (!Array.isArray(parsedProductType)) {
            parsedProductType = [];
          }
        } catch (error) {
          console.error("Error parsing productType:", error);
          parsedProductType = [];
        }
      }

      const newProduct = await prisma.product.create({
        data: {
          name: cleanName,
          description,
          // Set brandId when provided (allow empty string or "null" to clear)
          ...(req.body.brandId !== undefined && {
            brandId:
              req.body.brandId === "" || req.body.brandId === "null"
                ? null
                : req.body.brandId,
          }),
          slug,
          hasVariants: hasVariants === "true" || hasVariants === true,
          featured: featured === "true" || featured === true,
          productType: parsedProductType,
          isActive: isActive === "true" || isActive === true || true,
          metaTitle: metaTitle || cleanName,
          metaDescription: metaDescription || description,
          keywords,
          tags: req.body.tags
            ? Array.isArray(req.body.tags)
              ? req.body.tags
              : [req.body.tags]
            : [],
          topBrandIds: req.body.topBrandIds
            ? typeof req.body.topBrandIds === "string"
              ? JSON.parse(req.body.topBrandIds)
              : req.body.topBrandIds
            : [],
          newBrandIds: req.body.newBrandIds
            ? typeof req.body.newBrandIds === "string"
              ? JSON.parse(req.body.newBrandIds)
              : req.body.newBrandIds
            : [],
          hotBrandIds: req.body.hotBrandIds
            ? typeof req.body.hotBrandIds === "string"
              ? JSON.parse(req.body.hotBrandIds)
              : req.body.hotBrandIds
            : [],
          ourProduct: ourProduct === "true" || ourProduct === true,
        },
      });

      // Create product-category connections
      for (const catId of parsedCategoryIds) {
        await prisma.productCategory.create({
          data: {
            productId: newProduct.id,
            categoryId: catId,
            isPrimary: catId === primaryCategory,
          },
        });
      }

      // Create product variants
      let variants = [];
      if (variantsJson) {
        try {
          if (typeof variantsJson === "string") {
            if (
              variantsJson.trim().startsWith("[") &&
              variantsJson.trim().endsWith("]")
            ) {
              variants = JSON.parse(variantsJson);
            } else {
              console.warn(
                "Invalid variants JSON string format:",
                variantsJson
              );
              variants = [];
            }
          } else if (Array.isArray(variantsJson)) {
            variants = variantsJson;
          } else {
            console.error(
              "Unexpected variants format:",
              typeof variantsJson,
              variantsJson
            );
            variants = [];
          }

          // Ensure variants is always an array
          if (!Array.isArray(variants)) {
            console.warn("Variants is not an array after parsing:", variants);
            variants = [];
          }

          if (hasVariants === "true" || hasVariants === true) {
            if (variants.length === 0) {
              throw new ApiError(
                400,
                "At least one product variant is required for variant products"
              );
            }
          }
        } catch (error) {
          console.error("Error parsing variants:", error, variantsJson);
          throw new ApiError(
            400,
            `Invalid variants data format: ${error.message}`
          );
        }
      }

      // Get primary category name for SKU generation
      const categoryNames = {};
      for (const catId of parsedCategoryIds) {
        const category = await prisma.category.findUnique({
          where: { id: catId },
          select: { name: true },
        });
        if (category) {
          categoryNames[catId] = category.name;
        }
      }

      let primaryCategoryName = "";
      if (primaryCategory && categoryNames[primaryCategory]) {
        primaryCategoryName = categoryNames[primaryCategory];
      } else if (Object.values(categoryNames).length > 0) {
        // Use the first category if primary is not found
        primaryCategoryName = Object.values(categoryNames)[0];
      }

      // Prepare product info for SKU generation
      const productInfo = {
        name: cleanName,
        categoryName: primaryCategoryName,
        basePrice: req.body.price ? parseFloat(req.body.price) : 0,
      };

      for (const variant of variants) {
        // Get attribute value IDs for SKU generation
        const attributeValueIds = variant.attributeValueIds || [];

        // Generate SKU suffix from attributes if provided
        let variantSuffix = "";
        if (attributeValueIds.length > 0) {
          const { generateSKUSuffixFromAttributes } = await import(
            "../utils/variant-attributes.js"
          );
          variantSuffix = await generateSKUSuffixFromAttributes(
            attributeValueIds,
            prisma
          );
        }

        // Use provided SKU or keep as-is
        let variantSku = variant.sku || "";

        if (!variantSku || variantSku.trim() === "") {
          // If absolutely no SKU, generate one only as a fallback
          const { generateSKU } = await import("../utils/generateSKU.js");
          variantSku = generateSKU(productInfo, "VAR", Math.floor(Math.random() * 100));
        }

        // Check if this SKU already exists
        const existingSku = await prisma.productVariant.findUnique({
          where: { sku: variantSku },
        });

        /* Overriding manual SKU on collision is disabled to respect user input
        if (existingSku) {
          // Use our utility to generate a completely new SKU
          variantSku = generateSKU(
            productInfo,
            variantSuffix.replace(/^-/, ""),
            Math.floor(Math.random() * 100)
          );
        }
        */

        const createdVariant = await prisma.productVariant.create({
          data: {
            productId: newProduct.id,
            sku: variantSku,
            price: parseFloat(variant.price),
            salePrice: variant.salePrice ? parseFloat(variant.salePrice) : null,
            quantity: parseInt(variant.quantity || 0),
            isActive: variant.isActive !== undefined ? variant.isActive : true,
            redirectUrl: variant.redirectUrl || null,
            attributes:
              attributeValueIds.length > 0
                ? {
                  create: attributeValueIds.map((attributeValueId) => ({
                    attributeValueId,
                  })),
                }
                : undefined,
            // Add shipping dimensions
            shippingLength: variant.shippingLength ? parseFloat(variant.shippingLength) : null,
            shippingBreadth: variant.shippingBreadth ? parseFloat(variant.shippingBreadth) : null,
            shippingHeight: variant.shippingHeight ? parseFloat(variant.shippingHeight) : null,
            shippingWeight: variant.shippingWeight ? parseFloat(variant.shippingWeight) : null,
          },
        });

        // Store variant ID for later use in image processing
        variant._dbId = createdVariant.id;

        // Handle Variant Level MOQ
        if (variant.moq && variant.moq.isActive) {
          await prisma.mOQSetting.create({
            data: {
              scope: "VARIANT",
              variantId: createdVariant.id,
              minQuantity: parseInt(variant.moq.minQuantity) || 1,
              isActive: true
            }
          });
        }

        // Handle Variant Pricing Slabs
        if (variant.pricingSlabs && variant.pricingSlabs.length > 0) {
          await prisma.pricingSlab.createMany({
            data: variant.pricingSlabs.map(slab => ({
              variantId: createdVariant.id,
              minQty: parseInt(slab.minQty),
              maxQty: slab.maxQty ? parseInt(slab.maxQty) : null,
              price: parseFloat(slab.price)
            }))
          });
        }

        // Store variant ID for later use in image processing
        variant._dbId = createdVariant.id;
      }

      // If we don't have any variants and it's not a variant product, create a default variant
      if (
        variants.length === 0 &&
        (hasVariants === "false" ||
          hasVariants === false ||
          hasVariants === undefined)
      ) {
        // Log values for debugging
        console.log("Creating default variant with values:", {
          price: req.body.price,
          salePrice: req.body.salePrice,
          quantity: req.body.quantity,
        });

        // Use admin-provided SKU if available, otherwise generate default
        let defaultSku = req.body.sku;
        if (!defaultSku || defaultSku.trim() === "") {
          defaultSku = generateSKU(productInfo, "DEFAULT");
        }

        // Check if SKU already exists
        const existingSku = await prisma.productVariant.findUnique({
          where: { sku: defaultSku },
        });

        /* Overriding manual SKU on collision is disabled
        if (existingSku) {
          // Generate a new unique SKU
          defaultSku = generateSKU(productInfo, "DEFAULT", Math.floor(Math.random() * 100));
        }
        */

        // Ensure price, salePrice, and quantity are properly parsed
        const price = req.body.price ? parseFloat(req.body.price) : 0;
        const salePrice =
          req.body.salePrice &&
            req.body.salePrice !== "null" &&
            req.body.salePrice !== ""
            ? parseFloat(req.body.salePrice)
            : null;
        const quantity = req.body.quantity ? parseInt(req.body.quantity) : 0;

        // Create the default variant with properly parsed values
        await prisma.productVariant.create({
          data: {
            productId: newProduct.id,
            sku: defaultSku,
            price: price,
            salePrice: salePrice,
            quantity: quantity,
            isActive: true,
            // Add shipping dimensions for simple product (default variant)
            shippingLength: req.body.shippingLength ? parseFloat(req.body.shippingLength) : null,
            shippingBreadth: req.body.shippingBreadth ? parseFloat(req.body.shippingBreadth) : null,
            shippingHeight: req.body.shippingHeight ? parseFloat(req.body.shippingHeight) : null,
            shippingWeight: req.body.shippingWeight ? parseFloat(req.body.shippingWeight) : null,
          },
        });

        // Handle Simple Product MOQ (Linked to Product ID)
        if (req.body.moqSettings) {
          try {
            const moqSettings = typeof req.body.moqSettings === 'string'
              ? JSON.parse(req.body.moqSettings)
              : req.body.moqSettings;

            if (moqSettings && moqSettings.isActive) {
              await prisma.mOQSetting.create({
                data: {
                  scope: "PRODUCT",
                  productId: newProduct.id,
                  minQuantity: parseInt(moqSettings.minQuantity) || 1,
                  isActive: true
                }
              });
            }
          } catch (e) { console.error("Error saving simple product MOQ:", e); }
        }

        // Handle Simple Product Pricing Slabs
        if (req.body.pricingSlabs) {
          try {
            const slabs = typeof req.body.pricingSlabs === 'string'
              ? JSON.parse(req.body.pricingSlabs)
              : req.body.pricingSlabs;

            if (Array.isArray(slabs) && slabs.length > 0) {
              await prisma.pricingSlab.createMany({
                data: slabs.map(slab => ({
                  productId: newProduct.id,
                  minQty: parseInt(slab.minQty),
                  maxQty: slab.maxQty ? parseInt(slab.maxQty) : null,
                  price: parseFloat(slab.price)
                }))
              });
            }
          } catch (e) { console.error("Error saving simple product pricing slabs:", e); }
        }
      }

      // Upload product images if provided
      if (req.files && req.files.length > 0) {
        console.log(
          `📸 Uploading ${req.files.length} images for product ${newProduct.id}`
        );
        let primaryImageIndex = 0;

        // Get primary image index from request body
        if (req.body.primaryImageIndex !== undefined) {
          try {
            primaryImageIndex = parseInt(req.body.primaryImageIndex);
            // Ensure it's within valid range
            if (
              isNaN(primaryImageIndex) ||
              primaryImageIndex < 0 ||
              primaryImageIndex >= req.files.length
            ) {
              primaryImageIndex = 0;
            }
          } catch (error) {
            console.error("Error parsing primaryImageIndex:", error);
            primaryImageIndex = 0;
          }
        }

        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          console.log(`📸 Processing image ${i + 1}: ${file.originalname}`);
          try {
            console.log(
              `📸 Starting upload for file: ${file.originalname}, size: ${file.size} bytes`
            );
            const imageUrl = await processAndUploadImage(
              file,
              `products/${newProduct.id}`
            );
            console.log(`✅ Image uploaded to S3: ${imageUrl}`);

            const savedImage = await prisma.productImage.create({
              data: {
                productId: newProduct.id,
                url: imageUrl,
                alt: `${newProduct.name} - Image ${i + 1}`,
                isPrimary: i === primaryImageIndex,
                order: i,
              },
            });
            console.log(`✅ Image saved to database with ID: ${savedImage.id}`);
          } catch (error) {
            console.error(`❌ Error uploading image ${i + 1}:`, error);
            console.error(`❌ Error details:`, {
              message: error.message,
              stack: error.stack,
              filename: file?.originalname,
              filesize: file?.size,
            });
            // Don't throw error to prevent product creation failure
            // Just log the error and continue
            console.warn(`⚠️ Continuing product creation without this image`);
          }
        }
      } else if (req.file) {
        // For backward compatibility with single image upload
        const imageUrl = await processAndUploadImage(
          req.file,
          `products/${newProduct.id}`
        );

        await prisma.productImage.create({
          data: {
            productId: newProduct.id,
            url: imageUrl,
            alt: newProduct.name,
            isPrimary: true,
          },
        });
      }

      // Process variant images if any
      if (variants.length > 0 && req.files) {
        console.log("🔍 Processing variant images...");

        // Group files by variant index
        const variantImageFiles = {};
        req.files.forEach((file) => {
          // Check if this is a variant image file
          const variantMatch = file.fieldname.match(/^variantImages_(\d+)$/);
          if (variantMatch) {
            const variantIndex = parseInt(variantMatch[1]);
            if (!variantImageFiles[variantIndex]) {
              variantImageFiles[variantIndex] = [];
            }
            variantImageFiles[variantIndex].push(file);
          }
        });

        // Upload images for each variant
        for (const variantIndex in variantImageFiles) {
          const files = variantImageFiles[variantIndex];
          const variant = variants[parseInt(variantIndex)];

          if (variant && variant._dbId) {
            console.log(
              `📸 Uploading ${files.length} images for variant ${variant._dbId}`
            );

            for (let i = 0; i < files.length; i++) {
              const file = files[i];
              try {
                const imageUrl = await processAndUploadImage(
                  file,
                  `products/${newProduct.id}/variants/${variant._dbId}`
                );

                await prisma.productVariantImage.create({
                  data: {
                    variantId: variant._dbId,
                    url: imageUrl,
                    alt: `${variant.name || newProduct.name} - Variant Image ${i + 1
                      }`,
                    isPrimary: i === 0, // First image is primary
                    order: i, // Set proper order
                  },
                });

                console.log(`✅ Variant image uploaded: ${imageUrl}`);
              } catch (error) {
                console.error(`❌ Error uploading variant image:`, error);
              }
            }
          }
        }
      }

      // Return product with relations
      return await prisma.product.findUnique({
        where: { id: newProduct.id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          images: true,
          variants: {
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
        },
      });
    });

    // Format the response data
    try {
      const formattedProduct = {
        ...result,
        // Extract categories into a more usable format
        categories: result.categories.map((pc) => ({
          id: pc.category.id,
          name: pc.category.name,
          description: pc.category.description,
          image: pc.category.image ? getFileUrl(pc.category.image) : null,
          slug: pc.category.slug,
          isPrimary: pc.isPrimary,
        })),
        primaryCategory:
          result.categories.find((pc) => pc.isPrimary)?.category ||
          (result.categories.length > 0 ? result.categories[0].category : null),
        images: result.images.map((image) => ({
          ...image,
          url: getFileUrl(image.url),
        })),
        variants: result.variants.map((variant) => ({
          ...variant,
          color: variant.color
            ? {
              ...variant.color,
              image: variant.color.image
                ? getFileUrl(variant.color.image)
                : null,
            }
            : null,
          images: variant.images
            ? variant.images.map((image) => ({
              ...image,
              url: getFileUrl(image.url),
            }))
            : [],
        })),
        // Include message when variants couldn't be deleted due to orders
        _message:
          variantIdsWithOrders && variantIdsWithOrders.length > 0
            ? "Some variants could not be deleted because they have associated orders."
            : undefined,
      };

      // Send success response
      res
        .status(201)
        .json(
          new ApiResponsive(
            201,
            { product: formattedProduct },
            "Product created successfully"
          )
        );
    } catch (formattingError) {
      // If formatting fails but product was created, still return success
      console.error("Error formatting product response:", formattingError);
      res.status(201).json(
        new ApiResponsive(
          201,
          {
            product: {
              id: result.id,
              name: result.name,
              slug: result.slug,
            },
          },
          "Product created successfully but encountered error formatting response"
        )
      );
    }
  } catch (error) {
    console.error("Product creation error:", error);
    throw new ApiError(500, `Failed to create product: ${error.message}`);
  }
});

// Update a product
export const updateProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  console.log(`[DEBUG] updateProduct called for ID: ${productId}`);
  console.log(`[DEBUG] Body Keys: ${Object.keys(req.body).join(", ")}`);

  const {
    name,
    description,
    categoryIds,
    primaryCategoryId,
    featured,
    productType,
    isActive,
    hasVariants,
    variants: variantsJson,
    price,
    salePrice,
    quantity,
    metaTitle,
    metaDescription,
    keywords,
    ourProduct,
  } = req.body;

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      images: true,
      variants: {
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
      reviews: true,
      orderItems: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Declare variantIdsWithOrders in outer scope so it's available after the transaction
  let variantIdsWithOrders = [];

  // Parse category IDs if provided
  let parsedCategoryIds = [];
  if (categoryIds) {
    try {
      parsedCategoryIds = JSON.parse(categoryIds);
      if (!Array.isArray(parsedCategoryIds)) {
        throw new ApiError(400, "Invalid categories format");
      }
    } catch (error) {
      throw new ApiError(400, "Invalid categories format");
    }
  }

  // In the transaction, update categories if provided
  if (parsedCategoryIds.length > 0 || primaryCategoryId) {
    // Delete existing category connections
    if (parsedCategoryIds.length > 0) {
      await prisma.productCategory.deleteMany({
        where: { productId },
      });

      // Create new category connections
      for (const catId of parsedCategoryIds) {
        await prisma.productCategory.create({
          data: {
            productId,
            categoryId: catId,
            isPrimary: catId === (primaryCategoryId || parsedCategoryIds[0]),
          },
        });
      }
    } else if (primaryCategoryId) {
      // Update the primary category
      // First, set all to not primary
      await prisma.productCategory.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });

      // Then, set the selected one to primary
      await prisma.productCategory.updateMany({
        where: {
          productId,
          categoryId: primaryCategoryId,
        },
        data: { isPrimary: true },
      });
    }
  }

  // If changing the name, update the slug and check if it conflicts
  let slug = product.slug;
  if (name && name !== product.name) {
    slug = createSlug(name);

    // Check if new slug conflicts with existing products
    const existingProduct = await prisma.product.findFirst({
      where: {
        slug,
        id: { not: productId },
      },
    });

    if (existingProduct) {
      throw new ApiError(409, "Product with similar name already exists");
    }
  }

  // Check if category exists if changing
  if (parsedCategoryIds.length > 0 || primaryCategoryId) {
    const categoriesToCheck =
      parsedCategoryIds.length > 0 ? parsedCategoryIds : [primaryCategoryId];

    for (const catId of categoriesToCheck) {
      const category = await prisma.category.findUnique({
        where: { id: catId },
      });

      if (!category) {
        throw new ApiError(404, `Category with ID ${catId} not found`);
      }
    }
  }

  // Update the product with transaction to handle variants and images
  try {
    const result = await prisma.$transaction(async (prisma) => {
      const hasVariantsValue = hasVariants === "true" || hasVariants === true;
      // Update product basic info
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          ...(name && { name }),
          ...(name && { slug }),
          ...(description !== undefined && { description }),
          ...(hasVariants !== undefined && { hasVariants: hasVariantsValue }),
          ...(featured !== undefined && {
            featured: featured === "true" || featured === true,
          }),
          ...(productType !== undefined && {
            productType:
              typeof productType === "string"
                ? JSON.parse(productType)
                : productType,
          }),
          ...(isActive !== undefined && {
            isActive: isActive === "true" || isActive === true,
          }),
          ...(metaTitle !== undefined && { metaTitle }),
          ...(metaDescription !== undefined && { metaDescription }),
          ...(keywords !== undefined && { keywords }),
          ...(req.body.tags !== undefined && {
            tags: Array.isArray(req.body.tags)
              ? req.body.tags
              : [req.body.tags],
          }),
          ...(req.body.topBrandIds !== undefined && {
            topBrandIds:
              typeof req.body.topBrandIds === "string"
                ? JSON.parse(req.body.topBrandIds)
                : req.body.topBrandIds,
          }),
          ...(req.body.newBrandIds !== undefined && {
            newBrandIds:
              typeof req.body.newBrandIds === "string"
                ? JSON.parse(req.body.newBrandIds)
                : req.body.newBrandIds,
          }),
          ...(req.body.hotBrandIds !== undefined && {
            hotBrandIds:
              typeof req.body.hotBrandIds === "string"
                ? JSON.parse(req.body.hotBrandIds)
                : req.body.hotBrandIds,
          }),
          ...(ourProduct !== undefined && {
            ourProduct: ourProduct === "true" || ourProduct === true,
          }),
          ...(req.body.brandId !== undefined && {
            brandId:
              req.body.brandId === "" || req.body.brandId === "null"
                ? null
                : req.body.brandId,
          }),
        },
      });

      // Get all categories for this product after update
      const updatedCategories = await prisma.productCategory.findMany({
        where: { productId },
        include: {
          category: true,
        },
      });

      // Get the primary category or first category
      const primaryCat =
        updatedCategories.find((pc) => pc.isPrimary) ||
        (updatedCategories.length > 0 ? updatedCategories[0] : null);
      const primaryCategoryName = primaryCat?.category?.name || "";

      // Create base SKU for auto-generation
      const namePart = updatedProduct.name
        .substring(0, 3)
        .toUpperCase()
        .replace(/\s+/g, "");
      const categoryPart = primaryCategoryName
        .substring(0, 3)
        .toUpperCase()
        .replace(/\s+/g, "");
      const timestamp = Date.now().toString().slice(-4);
      const baseSku = `${namePart}${categoryPart}${timestamp}`;

      // Handle variants update if provided
      if (variantsJson) {
        let variants = [];
        try {
          variants = JSON.parse(variantsJson);
          if (hasVariantsValue) {
            if (!Array.isArray(variants) || variants.length === 0) {
              throw new ApiError(
                400,
                "At least one product variant is required"
              );
            }
          }
        } catch (error) {
          throw new ApiError(400, "Invalid variants data format");
        }

        // Get existing variant IDs to determine which to update/delete
        const existingVariantIds = product.variants.map((v) => v.id);

        // Get variant IDs that exist in the updated data (only valid DB IDs)
        const updatedVariantIds = variants
          .filter(
            (v) => v.id && !v.id.startsWith("new-") && !v.id.startsWith("temp-")
          )
          .map((v) => v.id);

        // All existing variants that are NOT in the updated list should be deleted (or Deactivated)
        const variantIdsToDelete = existingVariantIds.filter(
          (id) => !updatedVariantIds.includes(id)
        );

        // Delete removed variants safely
        if (variantIdsToDelete.length > 0) {
          console.log(
            `🗑️ Preparing to delete variants: ${variantIdsToDelete.join(", ")}`
          );

          // First, get all variant images that need to be deleted from S3
          const variantsToDelete = await prisma.productVariant.findMany({
            where: { id: { in: variantIdsToDelete } },
            include: {
              images: true,
            },
          });

          // Check if any variants have related order items
          const variantsWithOrders = await prisma.orderItem.findMany({
            where: {
              variantId: { in: variantIdsToDelete },
            },
            select: {
              variantId: true,
            },
            distinct: ["variantId"],
          });

          // Assign to outer scope variable instead of creating a new const
          variantIdsWithOrders = variantsWithOrders.map(
            (item) => item.variantId
          );

          if (variantIdsWithOrders.length > 0) {
            // For variants that have orders, mark them as inactive instead of deleting
            await prisma.productVariant.updateMany({
              where: {
                id: { in: variantIdsWithOrders },
              },
              data: {
                isActive: false,
              },
            });

            // Only delete variants that don't have orders
            const safeToDeleteIds = variantIdsToDelete.filter(
              (id) => !variantIdsWithOrders.includes(id)
            );

            if (safeToDeleteIds.length > 0) {
              // Clean up images from S3 before deleting variants
              const variantsToActuallyDelete = variantsToDelete.filter((v) =>
                safeToDeleteIds.includes(v.id)
              );

              for (const variant of variantsToActuallyDelete) {
                if (variant.images && variant.images.length > 0) {
                  console.log(
                    `🧹 Cleaning up ${variant.images.length} images for variant ${variant.sku}`
                  );
                  for (const image of variant.images) {
                    try {
                      await deleteFromS3(image.url);
                      console.log(
                        `✅ Deleted variant image from S3: ${image.url}`
                      );
                    } catch (error) {
                      console.error(
                        `❌ Failed to delete variant image from S3: ${image.url}`,
                        error
                      );
                    }
                  }
                }
              }

              await prisma.productVariant.deleteMany({
                where: { id: { in: safeToDeleteIds } },
              });
              console.log(
                `✅ Deleted ${safeToDeleteIds.length} variants from database`
              );
            }

            // Don't try to save notes to the database since the field doesn't exist in the schema            // Just log a message instead            console.log(`Product ${productId}: Some variants could not be deleted because they have associated orders.`);                        // We'll include this message in the API response after the transaction
          } else {
            // If no variants have orders, delete them all
            console.log(
              `Deleting all requested variants: ${variantIdsToDelete.join(
                ", "
              )}`
            );

            // Clean up ALL variant images from S3 before deleting
            for (const variant of variantsToDelete) {
              if (variant.images && variant.images.length > 0) {
                console.log(
                  `🧹 Cleaning up ${variant.images.length} images for variant ${variant.sku}`
                );
                for (const image of variant.images) {
                  try {
                    await deleteFromS3(image.url);
                    console.log(
                      `✅ Deleted variant image from S3: ${image.url}`
                    );
                  } catch (error) {
                    console.error(
                      `❌ Failed to delete variant image from S3: ${image.url}`,
                      error
                    );
                  }
                }
              }
            }

            await prisma.productVariant.deleteMany({
              where: { id: { in: variantIdsToDelete } },
            });
            console.log(
              `✅ Deleted ${variantIdsToDelete.length} variants from database`
            );
          }
        }

        // Update or create variants
        for (const variant of variants) {
          // Check if this is an existing variant to update (has a valid DB ID)
          const isExistingVariant =
            variant.id &&
            !variant.id.startsWith("new-") &&
            !variant.id.startsWith("field") &&
            existingVariantIds.includes(variant.id);

          // For existing variants, first check if it still exists in the database
          if (isExistingVariant) {
            const variantExists = await prisma.productVariant.findUnique({
              where: { id: variant.id },
            });

            if (!variantExists) {
              variant.id = null;
            }
          }

          if (isExistingVariant && variant.id) {
            // Update existing variant
            // Auto-generate SKU if not provided
            // Use provided SKU or keep as-is
            let variantSku = variant.sku || "";

            if (!variantSku || variantSku.trim() === "") {
              const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, "0");
              variantSku = `${baseSku}-${randomSuffix}`;
            }

            // Check if this SKU already exists
            const existingSku = await prisma.productVariant.findFirst({
              where: {
                sku: variantSku,
                id: { not: variant.id },
              },
            });

            /* Overriding manual SKU on collision is disabled to respect user input
            if (existingSku) {
              // Add a random suffix if auto-generated SKU already exists
              const randomSuffix = Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0");
              variantSku = `${variantSku}-${randomSuffix}`;
            }
            */

            // Better error handling for variant price parsing
            let parsedPrice = 0;
            let parsedSalePrice = null;
            let parsedQuantity = 0;

            try {
              // Parse price with validation
              if (variant.price) {
                parsedPrice = parseFloat(variant.price);
                if (isNaN(parsedPrice)) {
                  console.warn(
                    `Invalid price value: ${variant.price}, defaulting to 0`
                  );
                  parsedPrice = 0;
                }
              }

              // Parse sale price with validation
              if (
                variant.salePrice &&
                variant.salePrice !== "null" &&
                variant.salePrice !== ""
              ) {
                parsedSalePrice = parseFloat(variant.salePrice);
                if (isNaN(parsedSalePrice)) {
                  console.warn(
                    `Invalid sale price value: ${variant.salePrice}, defaulting to null`
                  );
                  parsedSalePrice = null;
                }
              }

              // Parse quantity with validation
              if (variant.quantity) {
                parsedQuantity = parseInt(variant.quantity);
                if (isNaN(parsedQuantity)) {
                  console.warn(
                    `Invalid quantity value: ${variant.quantity}, defaulting to 0`
                  );
                  parsedQuantity = 0;
                }
              }
            } catch (error) {
              console.error(`Error parsing variant data: ${error.message}`);
            }

            // Handle variant image cleanup if images were removed
            if (
              variant.removedImageIds &&
              Array.isArray(variant.removedImageIds) &&
              variant.removedImageIds.length > 0
            ) {
              console.log(
                `🧹 Cleaning up ${variant.removedImageIds.length} removed images for variant ${variant.id}`
              );

              // Get the images to be deleted
              const imagesToDelete = await prisma.productVariantImage.findMany({
                where: {
                  id: { in: variant.removedImageIds },
                  variantId: variant.id, // Security check
                },
              });

              // Delete from S3 first
              for (const image of imagesToDelete) {
                try {
                  await deleteFromS3(image.url);
                  console.log(`✅ Deleted removed image from S3: ${image.url}`);
                } catch (error) {
                  console.error(
                    `❌ Failed to delete image from S3: ${image.url}`,
                    error
                  );
                }
              }

              // Delete from database
              await prisma.productVariantImage.deleteMany({
                where: {
                  id: { in: variant.removedImageIds },
                  variantId: variant.id, // Security check
                },
              });

              // Reorder remaining images
              const remainingImages = await prisma.productVariantImage.findMany(
                {
                  where: { variantId: variant.id },
                  orderBy: { order: "asc" },
                }
              );

              // Update order values to close gaps
              for (let i = 0; i < remainingImages.length; i++) {
                await prisma.productVariantImage.update({
                  where: { id: remainingImages[i].id },
                  data: { order: i },
                });
              }

              // Ensure we have a primary image
              if (remainingImages.length > 0) {
                const hasPrimary = remainingImages.some((img) => img.isPrimary);
                if (!hasPrimary) {
                  await prisma.productVariantImage.update({
                    where: { id: remainingImages[0].id },
                    data: { isPrimary: true },
                  });
                  console.log(
                    `✅ Set new primary image for variant ${variant.id}`
                  );
                }
              }
            }

            // Prepare update data
            const updateData = {
              sku: variantSku || variant.sku,
              price: parsedPrice,
              salePrice: parsedSalePrice,
              quantity: parsedQuantity,
              isActive:
                variant.isActive !== undefined ? variant.isActive : true,
              redirectUrl: variant.redirectUrl !== undefined ? variant.redirectUrl : undefined,
            };

            // Handle attributes if provided
            if (
              variant.attributeValueIds &&
              Array.isArray(variant.attributeValueIds) &&
              variant.attributeValueIds.length > 0
            ) {
              // Delete existing attribute mappings
              await prisma.variantAttributeValue.deleteMany({
                where: { variantId: variant.id },
              });

              // Create new attribute mappings
              updateData.attributes = {
                create: variant.attributeValueIds.map((attributeValueId) => ({
                  attributeValueId,
                })),
              };
            }

            // Update shipping dimensions
            if (variant.shippingLength !== undefined) updateData.shippingLength = variant.shippingLength ? parseFloat(variant.shippingLength) : null;
            if (variant.shippingBreadth !== undefined) updateData.shippingBreadth = variant.shippingBreadth ? parseFloat(variant.shippingBreadth) : null;
            if (variant.shippingHeight !== undefined) updateData.shippingHeight = variant.shippingHeight ? parseFloat(variant.shippingHeight) : null;
            if (variant.shippingWeight !== undefined) updateData.shippingWeight = variant.shippingWeight ? parseFloat(variant.shippingWeight) : null;

            await prisma.productVariant.update({
              where: { id: variant.id },
              data: updateData,
            });

            // Handle Variant Level MOQ Setup
            if (variant.moq) {
              if (variant.moq.isActive) {
                await prisma.mOQSetting.upsert({
                  where: {
                    scope_productId_variantId: {
                      scope: "VARIANT",
                      productId: productId,
                      variantId: variant.id
                    }
                  },
                  create: {
                    scope: "VARIANT",
                    variantId: variant.id,
                    productId: productId,
                    minQuantity: parseInt(variant.moq.minQuantity) || 1,
                    isActive: true
                  },
                  update: {
                    minQuantity: parseInt(variant.moq.minQuantity) || 1,
                    isActive: true
                  }
                });
              } else {
                // If disabled, we might want to delete or Set inactive
                // Let's delete to keep it clean
                await prisma.mOQSetting.deleteMany({
                  where: {
                    scope: "VARIANT",
                    variantId: variant.id
                  }
                });
              }
            }

            // Handle Variant Pricing Slabs
            if (variant.pricingSlabs) {
              // First delete existing slabs for this variant (simplest way to update)
              await prisma.pricingSlab.deleteMany({
                where: { variantId: variant.id }
              });

              // create new ones
              if (variant.pricingSlabs.length > 0) {
                await prisma.pricingSlab.createMany({
                  data: variant.pricingSlabs.map(slab => ({
                    variantId: variant.id,
                    minQty: parseInt(slab.minQty),
                    maxQty: slab.maxQty ? parseInt(slab.maxQty) : null,
                    price: parseFloat(slab.price)
                  }))
                });
              }
            }
          } else {
            // Create new variant
            // Auto-generate SKU if not provided
            // Use provided SKU or keep as-is
            let variantSku = variant.sku || "";

            if (!variantSku || variantSku.trim() === "") {
              const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, "0");
              variantSku = `${baseSku}-${randomSuffix}`;
            }

            // Check if this SKU already exists
            const existingSku = await prisma.productVariant.findUnique({
              where: { sku: variantSku },
            });

            /* Overriding manual SKU on collision is disabled to respect user input
            if (existingSku) {
              // Add a random suffix if auto-generated SKU already exists
              const randomSuffix = Math.floor(Math.random() * 1000)
                .toString()
                .padStart(3, "0");
              variantSku = `${variantSku}-${randomSuffix}`;
            }
            */

            // Better error handling for variant price parsing
            let parsedPrice = 0;
            let parsedSalePrice = null;
            let parsedQuantity = 0;

            try {
              // Parse price with validation
              if (variant.price) {
                parsedPrice = parseFloat(variant.price);
                if (isNaN(parsedPrice)) {
                  console.warn(
                    `Invalid price value: ${variant.price}, defaulting to 0`
                  );
                  parsedPrice = 0;
                }
              }

              // Parse sale price with validation
              if (
                variant.salePrice &&
                variant.salePrice !== "null" &&
                variant.salePrice !== ""
              ) {
                parsedSalePrice = parseFloat(variant.salePrice);
                if (isNaN(parsedSalePrice)) {
                  console.warn(
                    `Invalid sale price value: ${variant.salePrice}, defaulting to null`
                  );
                  parsedSalePrice = null;
                }
              }

              // Parse quantity with validation
              if (variant.quantity) {
                parsedQuantity = parseInt(variant.quantity);
                if (isNaN(parsedQuantity)) {
                  console.warn(
                    `Invalid quantity value: ${variant.quantity}, defaulting to 0`
                  );
                  parsedQuantity = 0;
                }
              }
            } catch (error) {
              console.error(`Error parsing variant data: ${error.message}`);
            }

            // Prepare create data
            const createData = {
              productId,
              sku: variantSku || variant.sku,
              price: parsedPrice,
              salePrice: parsedSalePrice,
              quantity: parsedQuantity,
              isActive:
                variant.isActive !== undefined ? variant.isActive : true,
              redirectUrl: variant.redirectUrl || null,
            };

            // Handle attributes if provided
            if (
              variant.attributeValueIds &&
              Array.isArray(variant.attributeValueIds) &&
              variant.attributeValueIds.length > 0
            ) {
              createData.attributes = {
                create: variant.attributeValueIds.map((attributeValueId) => ({
                  attributeValueId,
                })),
              };
            }

            // Add Shipping data for new variant
            if (variant.shippingLength) createData.shippingLength = parseFloat(variant.shippingLength);
            if (variant.shippingBreadth) createData.shippingBreadth = parseFloat(variant.shippingBreadth);
            if (variant.shippingHeight) createData.shippingHeight = parseFloat(variant.shippingHeight);
            if (variant.shippingWeight) createData.shippingWeight = parseFloat(variant.shippingWeight);

            const newVariantDb = await prisma.productVariant.create({
              data: createData,
            });

            // Handle Variant Level MOQ for new variant
            if (variant.moq && variant.moq.isActive) {
              await prisma.mOQSetting.create({
                data: {
                  scope: "VARIANT",
                  variantId: newVariantDb.id,
                  productId: productId,
                  minQuantity: parseInt(variant.moq.minQuantity) || 1,
                  isActive: true
                }
              });
            }

            // Handle Variant Pricing Slabs
            if (variant.pricingSlabs && variant.pricingSlabs.length > 0) {
              await prisma.pricingSlab.createMany({
                data: variant.pricingSlabs.map(slab => ({
                  variantId: newVariantDb.id,
                  minQty: parseInt(slab.minQty),
                  maxQty: slab.maxQty ? parseInt(slab.maxQty) : null,
                  price: parseFloat(slab.price)
                }))
              });
            }
          }
        }
      } else if (
        hasVariants === "false" ||
        hasVariants === false ||
        hasVariants === null ||
        hasVariants === "null" ||
        hasVariants === undefined
      ) {
        // If switching to non-variant mode, handle simple product price and quantity
        // If no variants exist, create a default one, otherwise update the first one
        console.log(
          `📝 Processing non-variant product update. hasVariants: ${hasVariants}, existing variants: ${product.variants.length}`
        );
        if (product.variants.length === 0) {
          // Use admin-provided SKU if available, otherwise generate default
          let defaultSku = req.body.sku;
          if (!defaultSku || defaultSku.trim() === "") {
            defaultSku = `${baseSku}-DEF`;
          }

          // Check if SKU already exists
          const existingSku = await prisma.productVariant.findUnique({
            where: { sku: defaultSku },
          });

          if (existingSku) {
            // Generate a new unique SKU
            const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, "0");
            defaultSku = `${baseSku}-DEF-${randomSuffix}`;
          }

          // Ensure price, salePrice, and quantity are properly parsed
          // Parse price with validation
          let parsedPrice = 0;
          try {
            if (price) {
              parsedPrice = parseFloat(price);
              if (isNaN(parsedPrice)) {
                console.warn(`Invalid price value: ${price}, defaulting to 0`);
                parsedPrice = 0;
              }
            }
          } catch (error) {
            console.error(`Error parsing price: ${error.message}`);
          }

          // Parse sale price with validation
          let parsedSalePrice = null;
          try {
            if (salePrice && salePrice !== "null" && salePrice !== "") {
              parsedSalePrice = parseFloat(salePrice);
              if (isNaN(parsedSalePrice)) {
                console.warn(
                  `Invalid sale price value: ${salePrice}, defaulting to null`
                );
                parsedSalePrice = null;
              }
            }
          } catch (error) {
            console.error(`Error parsing sale price: ${error.message}`);
          }

          // Parse quantity with validation
          let parsedQuantity = 0;
          try {
            if (quantity !== undefined) {
              parsedQuantity = parseInt(quantity);
              if (isNaN(parsedQuantity)) {
                console.warn(
                  `Invalid quantity value: ${quantity}, defaulting to 0`
                );
                parsedQuantity = 0;
              }
            }
          } catch (error) {
            console.error(`Error parsing quantity: ${error.message}`);
          }

          await prisma.productVariant.create({
            data: {
              productId,
              sku: defaultSku,
              price: parsedPrice,
              salePrice: parsedSalePrice,
              quantity: parsedQuantity,
              isActive: true,
              redirectUrl: req.body.redirectUrl || null,
              // Add shipping dimensions for simple product (default variant)
              shippingLength: req.body.shippingLength ? parseFloat(req.body.shippingLength) : null,
              shippingBreadth: req.body.shippingBreadth ? parseFloat(req.body.shippingBreadth) : null,
              shippingHeight: req.body.shippingHeight ? parseFloat(req.body.shippingHeight) : null,
              shippingWeight: req.body.shippingWeight ? parseFloat(req.body.shippingWeight) : null,
            },
          });

          // Handle Simple Product MOQ (Linked to Product ID)
          if (req.body.moqSettings) {
            try {
              const moqSettings = JSON.parse(req.body.moqSettings);
              if (moqSettings && moqSettings.isActive) {
                await prisma.mOQSetting.upsert({
                  where: {
                    scope_productId_variantId: {
                      scope: "PRODUCT",
                      productId: productId,
                      variantId: null
                    }
                  },
                  create: {
                    scope: "PRODUCT",
                    productId: productId,
                    minQuantity: parseInt(moqSettings.minQuantity) || 1,
                    isActive: true
                  },
                  update: {
                    minQuantity: parseInt(moqSettings.minQuantity) || 1,
                    isActive: true
                  }
                });
              } else {
                await prisma.mOQSetting.deleteMany({
                  where: {
                    scope: "PRODUCT",
                    productId: productId
                  }
                });
              }
            } catch (e) { }
          }

          // Handle Simple Product Pricing Slabs
          if (req.body.pricingSlabs) {
            try {
              const slabs = JSON.parse(req.body.pricingSlabs);
              // Simple product slabs are attached to productId
              await prisma.pricingSlab.deleteMany({
                where: { productId: productId, variantId: null }
              });

              if (slabs.length > 0) {
                await prisma.pricingSlab.createMany({
                  data: slabs.map(slab => ({
                    productId: productId,
                    minQty: parseInt(slab.minQty),
                    maxQty: slab.maxQty ? parseInt(slab.maxQty) : null,
                    price: parseFloat(slab.price)
                  }))
                });
              }
            } catch (e) { }
          }
        } else {
          // Always update the price and other fields, even if they're not explicitly defined in the request
          // This fixes the issue where price wasn't updating when hasVariants was null

          // Robust parsing for price, salePrice, quantity and SKU
          const updateData = {};

          // Handle SKU update - use admin-provided SKU if available
          if (req.body.sku !== undefined && req.body.sku.trim() !== "") {
            // Check if the new SKU already exists (for a different variant)
            const existingSku = await prisma.productVariant.findFirst({
              where: {
                sku: req.body.sku,
                id: { not: product.variants[0].id }
              }
            });

            if (existingSku) {
              console.warn(`SKU "${req.body.sku}" already exists, keeping existing SKU`);
            } else {
              updateData.sku = req.body.sku;
              console.log(`Updating SKU to: ${req.body.sku}`);
            }
          }

          // Parse price with enhanced validation and debugging
          try {
            // Log the raw price to diagnose issues
            console.log(
              `Raw price received: '${price}', type: ${typeof price}`
            );

            if (price !== undefined) {
              // Try to parse as integer first then as float if necessary
              let parsedPrice;

              // Remove any formatting characters that might be causing issues
              const cleanPrice = String(price).replace(/[^\d.-]/g, "");
              console.log(`Cleaned price string: '${cleanPrice}'`);

              parsedPrice = parseFloat(cleanPrice);

              if (!isNaN(parsedPrice)) {
                updateData.price = parsedPrice;
                console.log(`Parsed price as number: ${parsedPrice}`);
              } else {
                console.warn(
                  `Invalid price value: ${price}, using existing price`
                );
                updateData.price = parseFloat(product.variants[0].price);
                console.log(`Using existing price: ${updateData.price}`);
              }
            } else {
              // Price is required, so use existing value if not provided
              updateData.price = parseFloat(product.variants[0].price);
              console.log(
                `Price not in request, using existing: ${updateData.price}`
              );
            }
          } catch (error) {
            console.error(`Error parsing price: ${error.message}`);
            updateData.price = parseFloat(product.variants[0].price);
          }

          // Parse sale price with validation - more aggressive checking
          try {
            // Log the raw sale price coming in to diagnose issues
            console.log(
              `Raw sale price received: '${salePrice}', type: ${typeof salePrice}`
            );

            // Consider salePrice as defined if it exists in the request
            if (salePrice !== undefined) {
              // Only set a non-null sale price if we have a valid number
              if (salePrice && salePrice !== "null" && salePrice !== "") {
                const parsedSalePrice = parseFloat(salePrice);
                if (!isNaN(parsedSalePrice)) {
                  updateData.salePrice = parsedSalePrice;
                  console.log(
                    `Parsed sale price as number: ${parsedSalePrice}`
                  );
                } else {
                  console.warn(
                    `Invalid sale price value: ${salePrice}, defaulting to null`
                  );
                  updateData.salePrice = null;
                }
              } else {
                console.log(
                  `Setting sale price to null because value is empty or null`
                );
                updateData.salePrice = null;
              }
            } else {
              console.log(
                `Sale price not provided in request, keeping existing value`
              );
              // Don't include salePrice in the update if it wasn't in the request
              // This means remove the salePrice key from updateData to prevent updates
              delete updateData.salePrice;
            }
          } catch (error) {
            console.error(`Error parsing sale price: ${error.message}`);
            // Don't update on error
            delete updateData.salePrice;
          }

          // Parse quantity with validation
          try {
            if (quantity !== undefined) {
              const parsedQuantity = parseInt(quantity);
              if (!isNaN(parsedQuantity)) {
                updateData.quantity = parsedQuantity;
              } else {
                console.warn(
                  `Invalid quantity value: ${quantity}, keeping existing quantity`
                );
                // Don't update quantity if invalid
              }
            } else {
              console.log(`📊 Quantity field is undefined, not updating`);
            }
          } catch (error) {
            console.error(`Error parsing quantity: ${error.message}`);
            // Don't update quantity on error
          }

          // Update shipping dimensions if provided
          if (req.body.shippingLength !== undefined) updateData.shippingLength = req.body.shippingLength ? parseFloat(req.body.shippingLength) : null;
          if (req.body.shippingBreadth !== undefined) updateData.shippingBreadth = req.body.shippingBreadth ? parseFloat(req.body.shippingBreadth) : null;
          if (req.body.shippingHeight !== undefined) updateData.shippingHeight = req.body.shippingHeight ? parseFloat(req.body.shippingHeight) : null;
          if (req.body.shippingWeight !== undefined) updateData.shippingWeight = req.body.shippingWeight ? parseFloat(req.body.shippingWeight) : null;

          // Check if we need to update any product level settings that might be passed
          // Handle Simple Product MOQ (Linked to Product ID)
          if (req.body.moqSettings) {
            try {
              const moqSettings = typeof req.body.moqSettings === 'string'
                ? JSON.parse(req.body.moqSettings)
                : req.body.moqSettings;

              if (moqSettings && moqSettings.isActive) {
                await prisma.mOQSetting.upsert({
                  where: {
                    scope_productId_variantId: {
                      scope: "PRODUCT",
                      productId: productId,
                      variantId: null
                    }
                  },
                  create: {
                    scope: "PRODUCT",
                    productId: productId,
                    minQuantity: parseInt(moqSettings.minQuantity) || 1,
                    isActive: true
                  },
                  update: {
                    minQuantity: parseInt(moqSettings.minQuantity) || 1,
                    isActive: true
                  }
                });
              } else {
                await prisma.mOQSetting.deleteMany({
                  where: {
                    scope: "PRODUCT",
                    productId: productId
                  }
                });
              }
            } catch (e) { }
          }

          // Handle Simple Product Pricing Slabs
          if (req.body.pricingSlabs) {
            try {
              const slabs = typeof req.body.pricingSlabs === 'string'
                ? JSON.parse(req.body.pricingSlabs)
                : req.body.pricingSlabs;

              // Simple product slabs are attached to productId
              await prisma.pricingSlab.deleteMany({
                where: { productId: productId, variantId: null }
              });

              if (Array.isArray(slabs) && slabs.length > 0) {
                await prisma.pricingSlab.createMany({
                  data: slabs.map(slab => ({
                    productId: productId,
                    minQty: parseInt(slab.minQty),
                    maxQty: slab.maxQty ? parseInt(slab.maxQty) : null,
                    price: parseFloat(slab.price)
                  }))
                });
              }
            } catch (e) { }
          }

          // Update the single variant (for simple product)
          if (product.variants && product.variants.length > 0) {
            // Include redirectUrl in simple product update
            if (req.body.redirectUrl !== undefined) {
              updateData.redirectUrl = req.body.redirectUrl;
            }
            await prisma.productVariant.update({
              where: { id: product.variants[0].id },
              data: updateData,
            });
          }
        }
      }


      // Handle image uploads if provided
      if (req.files && req.files.length > 0) {
        const primaryImageIndex = req.body.primaryImageIndex
          ? parseInt(req.body.primaryImageIndex)
          : 0;

        // If replacing all images, delete existing ones first
        if (req.body.replaceAllImages === "true") {
          try {
            console.log("Replacing all product images...");
            // Delete image files from storage
            for (const image of product.images) {
              console.log(`Deleting image from S3: ${image.url}`);
              await deleteFromS3(image.url);
            }

            // Delete from database
            await prisma.productImage.deleteMany({
              where: { productId },
            });
          } catch (error) {
            console.error("Error deleting existing images:", error);
            // Continue with upload even if deletion has issues
          }
        }

        // Upload new images
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const imageUrl = await processAndUploadImage(
            file,
            `products/${productId}`
          );

          await prisma.productImage.create({
            data: {
              productId,
              url: imageUrl,
              alt: `${updatedProduct.name} - Image ${i + 1}`,
              isPrimary: i === primaryImageIndex,
              order: i,
            },
          });
        }
      } else if (req.file) {
        try {
          // For backward compatibility with single image upload
          // Delete existing primary image if any
          const primaryImage = product.images.find((img) => img.isPrimary);
          if (primaryImage) {
            console.log(`Deleting primary image from S3: ${primaryImage.url}`);
            await deleteFromS3(primaryImage.url);
            await prisma.productImage.delete({
              where: { id: primaryImage.id },
            });
          }

          // Upload new primary image
          const imageUrl = await processAndUploadImage(
            req.file,
            `products/${productId}`
          );

          await prisma.productImage.create({
            data: {
              productId,
              url: imageUrl,
              alt: updatedProduct.name,
              isPrimary: true,
              order: 0,
            },
          });
        } catch (error) {
          console.error("Error updating primary image:", error);
          // Continue with response even if image upload fails
        }
      }

      // Get the current state of variants to ensure we have the latest data
      const refreshedVariants = await prisma.$queryRaw`
        SELECT * FROM "ProductVariant" WHERE "productId" = ${productId};
      `;

      // Get the full product with fresh data
      const freshProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          images: true,
          variants: {
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
            },
          },
        },
      });

      // Force update the variant data in the result to ensure it's fresh
      if (
        freshProduct &&
        freshProduct.variants &&
        freshProduct.variants.length > 0
      ) {
        for (const variant of freshProduct.variants) {
          const refreshedVariant = refreshedVariants.find(
            (v) => v.id === variant.id
          );
          if (refreshedVariant) {
            // Explicitly update the fields that might be stale
            variant.price = refreshedVariant.price;
            variant.salePrice = refreshedVariant.salePrice;
            variant.quantity = refreshedVariant.quantity;
            variant.updatedAt = refreshedVariant.updatedAt;
          }
        }
      }

      return freshProduct;
    });

    // Format the response data
    const formattedProduct = {
      ...result,
      // Extract categories into a more usable format
      categories: result.categories.map((pc) => ({
        id: pc.category.id,
        name: pc.category.name,
        description: pc.category.description,
        image: pc.category.image ? getFileUrl(pc.category.image) : null,
        slug: pc.category.slug,
        isPrimary: pc.isPrimary,
      })),
      primaryCategory:
        result.categories.find((pc) => pc.isPrimary)?.category ||
        (result.categories.length > 0 ? result.categories[0].category : null),
      images: result.images.map((image) => ({
        ...image,
        url: getFileUrl(image.url),
      })),
      variants: formatVariantsWithAttributes(result.variants).map(
        (variant) => ({
          ...variant,
          images: variant.images
            ? variant.images.map((img) => ({
              ...img,
              url: getFileUrl(img.url),
            }))
            : [],
        })
      ),
      // Include message when variants couldn't be deleted due to orders
      // (variantIdsWithOrders is only defined in update function, not create)
      _message: undefined,
    };

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          { product: formattedProduct },
          "Product updated successfully"
        )
      );
  } catch (error) {
    console.error("Product update error:", error);
    throw new ApiError(500, `Failed to update product: ${error.message}`);
  }
});

// Delete product
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { force } = req.query; // Add force parameter

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: true,
      variants: {
        include: {
          images: true, // Include variant images
        },
      },
      reviews: true,
      orderItems: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if product has any order items and force is not true
  if (product.orderItems.length > 0 && force !== "true") {
    // Instead of updating to inactive, just return with a message explaining the situation
    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "Product has associated orders and cannot be deleted. Use force=true to delete permanently."
        )
      );
    return;
  }

  // Delete product and related entities
  try {
    await prisma.$transaction(async (tx) => {
      // Delete all product images from S3
      for (const image of product.images) {
        try {
          await deleteFromS3(image.url);
          console.log(`Deleted product image from S3: ${image.url}`);
        } catch (error) {
          console.error(
            `Failed to delete product image from S3: ${image.url}`,
            error
          );
        }
      }

      // Delete all variant images from S3
      for (const variant of product.variants) {
        if (variant.images && variant.images.length > 0) {
          for (const variantImage of variant.images) {
            try {
              await deleteFromS3(variantImage.url);
              console.log(`Deleted variant image from S3: ${variantImage.url}`);
            } catch (error) {
              console.error(
                `Failed to delete variant image from S3: ${variantImage.url}`,
                error
              );
            }
          }
        }
      }

      // If force deleting a product with orders, handle the order items
      if (product.orderItems.length > 0 && force === "true") {
        // First delete order items referencing this product
        await tx.orderItem.deleteMany({
          where: { productId },
        });
      }

      // Delete related analytics data (ProductView entries)
      await tx.productView.deleteMany({
        where: { productId },
      });

      // Delete product and all related items (cascading deletes)
      await tx.product.delete({
        where: { id: productId },
      });
    });

    res
      .status(200)
      .json(new ApiResponsive(200, {}, "Product deleted successfully"));
  } catch (error) {
    console.error("Error deleting product:", error);
    throw new ApiError(500, `Failed to delete product: ${error.message}`);
  }
});

// Upload product image
export const uploadProductImage = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { isPrimary } = req.body;

  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  try {
    // Process and upload image to S3
    const imageUrl = await processAndUploadImage(
      req.file,
      `products/${productId}`
    );

    // Use a transaction to ensure all database operations complete together
    const result = await prisma.$transaction(async (tx) => {
      // If setting as primary, update other images to not be primary
      if (isPrimary === "true" || isPrimary === true) {
        await tx.productImage.updateMany({
          where: {
            productId,
            isPrimary: true,
          },
          data: { isPrimary: false },
        });
      }

      // Get the current highest order for this product
      const maxOrder = await tx.productImage.findFirst({
        where: { productId },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      const nextOrder = (maxOrder?.order || -1) + 1;

      // Create image record
      return await tx.productImage.create({
        data: {
          productId,
          url: imageUrl,
          alt: req.body.alt || product.name,
          isPrimary: isPrimary === "true" || isPrimary === true,
          order: nextOrder,
        },
      });
    });

    // Format response with full URL
    const formattedImage = {
      ...result,
      url: getFileUrl(imageUrl),
    };

    res
      .status(201)
      .json(
        new ApiResponsive(
          201,
          { image: formattedImage },
          "Product image uploaded successfully"
        )
      );
  } catch (error) {
    console.error("Image upload error:", error);
    throw new ApiError(500, `Failed to upload image: ${error.message}`);
  }
});

// Delete product image
export const deleteProductImage = asyncHandler(async (req, res, next) => {
  const { imageId } = req.params;

  // Check if image exists
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
    include: {
      product: {
        select: {
          id: true,
          images: {
            select: { id: true, isPrimary: true, url: true },
          },
        },
      },
    },
  });

  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  // Prevent deleting if it's the only image for the product
  if (image.product.images.length === 1) {
    throw new ApiError(400, "Cannot delete the only image for this product");
  }

  try {
    // Delete image from S3
    console.log(`Deleting image from S3: ${image.url}`);
    await deleteFromS3(image.url);

    // Check if this was the primary image
    const isPrimary = image.isPrimary;

    // Delete image record from database
    await prisma.productImage.delete({
      where: { id: imageId },
    });

    // If deleted image was primary, set the first remaining image as primary
    if (isPrimary) {
      const remainingImages = image.product.images.filter(
        (img) => img.id !== imageId
      );
      if (remainingImages.length > 0) {
        await prisma.productImage.update({
          where: { id: remainingImages[0].id },
          data: { isPrimary: true },
        });
      }
    }

    res
      .status(200)
      .json(new ApiResponsive(200, {}, "Product image deleted successfully"));
  } catch (error) {
    console.error("Error deleting image:", error);
    throw new ApiError(500, `Failed to delete image: ${error.message}`);
  }
});

// Create product variant
export const createProductVariant = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { sku, attributeValueIds, price, salePrice, quantity } = req.body;

  // Validate required fields
  if (!price || quantity === undefined) {
    throw new ApiError(400, "Price and quantity are required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Get primary category name for SKU generation
  const primaryCategory =
    product.categories.find((cat) => cat.isPrimary) ||
    (product.categories.length > 0 ? product.categories[0] : null);

  const categoryName = primaryCategory ? primaryCategory.category.name : "";

  // Prepare product info for SKU generation
  const productInfo = {
    name: product.name,
    categoryName: categoryName,
    basePrice: parseFloat(price),
  };

  // Generate SKU suffix from attributes if provided
  let variantSuffix = "";
  if (
    attributeValueIds &&
    Array.isArray(attributeValueIds) &&
    attributeValueIds.length > 0
  ) {
    const { generateSKUSuffixFromAttributes } = await import(
      "../utils/variant-attributes.js"
    );
    variantSuffix = await generateSKUSuffixFromAttributes(
      attributeValueIds,
      prisma
    );
  }

  // Auto-generate SKU if not provided
  let variantSku = sku;
  if (!variantSku || variantSku.trim() === "") {
    variantSku = generateSKU(productInfo, variantSuffix.replace(/^-/, ""));
  }

  // Check if this SKU already exists
  const existingSku = await prisma.productVariant.findUnique({
    where: { sku: variantSku },
  });

  /* Overriding manual SKU on collision is disabled to respect user input
  if (existingSku) {
    // Generate a completely new unique SKU
    variantSku = generateSKU(
      productInfo,
      variantSuffix.replace(/^-/, ""),
      Math.floor(Math.random() * 100)
    );
  }
  */

  // Create variant
  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku: variantSku,
      price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      quantity: parseInt(quantity),
      isActive: true,
      redirectUrl: req.body.redirectUrl || null,
      attributes:
        attributeValueIds &&
          Array.isArray(attributeValueIds) &&
          attributeValueIds.length > 0
          ? {
            create: attributeValueIds.map((attributeValueId) => ({
              attributeValueId,
            })),
          }
          : undefined,
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
    },
  });

  // Format variant with attributes
  const { formatVariantWithAttributes } = await import(
    "../utils/variant-attributes.js"
  );
  const formattedVariant = formatVariantWithAttributes(variant);

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { variant: formattedVariant },
        "Product variant created successfully"
      )
    );
});

// Update product variant
export const updateProductVariant = asyncHandler(async (req, res, next) => {
  const { variantId } = req.params;
  const { sku, attributeValueIds, price, salePrice, quantity, isActive } =
    req.body;

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      product: {
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
      },
      attributes: {
        include: {
          attributeValue: true,
        },
      },
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Get current attribute value IDs
  const currentAttributeValueIds = variant.attributes.map(
    (a) => a.attributeValueId
  );

  // Check if attributes are being changed
  const attributesChanged =
    attributeValueIds &&
    Array.isArray(attributeValueIds) &&
    (attributeValueIds.length !== currentAttributeValueIds.length ||
      !attributeValueIds.every((id) => currentAttributeValueIds.includes(id)));

  // If no SKU provided and attributes are changing, auto-generate a new one
  let variantSku = sku;
  if (!variantSku && attributesChanged) {
    const { generateSKUSuffixFromAttributes } = await import(
      "../utils/variant-attributes.js"
    );
    const productInfo = {
      name: variant.product.name,
      categoryName:
        variant.product.categories.length > 0
          ? variant.product.categories[0].category.name
          : "",
      basePrice: parseFloat(variant.price),
    };
    const suffix = await generateSKUSuffixFromAttributes(
      attributeValueIds,
      prisma
    );
    variantSku = generateSKU(productInfo, suffix.replace(/^-/, ""));
  }

  // Check if SKU already exists (if changing)
  if (variantSku && variantSku !== variant.sku) {
    const existingSku = await prisma.productVariant.findFirst({
      where: {
        sku: variantSku,
        id: { not: variantId },
      },
    });

    if (existingSku) {
      // If auto-generated SKU exists, add a random suffix
      if (!sku) {
        const randomSuffix = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        variantSku = `${variantSku}-${randomSuffix}`;
      } else {
        throw new ApiError(409, "SKU already exists");
      }
    }
  }

  // Check if this attribute combination already exists (if changing)
  if (attributesChanged) {
    // Get all variants for this product with their attributes
    const productVariants = await prisma.productVariant.findMany({
      where: {
        productId: variant.productId,
        id: { not: variantId },
      },
      include: {
        attributes: true,
      },
    });

    // Check if any variant has the same attribute combination
    const hasDuplicate = productVariants.some((pv) => {
      const pvAttributeValueIds = pv.attributes.map((a) => a.attributeValueId);
      if (pvAttributeValueIds.length !== attributeValueIds.length) {
        return false;
      }
      return attributeValueIds.every((id) => pvAttributeValueIds.includes(id));
    });

    if (hasDuplicate) {
      throw new ApiError(
        409,
        "A variant with this attribute combination already exists"
      );
    }
  }

  // Prepare update data
  const updateData = {
    ...(variantSku && { sku: variantSku }),
    ...(price !== undefined && { price: parseFloat(price) }),
    ...(salePrice !== undefined && {
      salePrice: salePrice ? parseFloat(salePrice) : null,
    }),
    ...(quantity !== undefined && { quantity: parseInt(quantity) }),
    ...(isActive !== undefined && {
      isActive: isActive === "true" || isActive === true,
    }),
    ...(req.body.redirectUrl !== undefined && { redirectUrl: req.body.redirectUrl }),
  };

  // Update attributes if provided
  if (attributesChanged) {
    // Delete existing attribute mappings
    await prisma.variantAttributeValue.deleteMany({
      where: { variantId },
    });

    // Create new attribute mappings
    if (
      attributeValueIds &&
      Array.isArray(attributeValueIds) &&
      attributeValueIds.length > 0
    ) {
      updateData.attributes = {
        create: attributeValueIds.map((attributeValueId) => ({
          attributeValueId,
        })),
      };
    }
  }

  // Update variant
  const updatedVariant = await prisma.productVariant.update({
    where: { id: variantId },
    data: updateData,
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
    },
  });

  // If updating quantity, log the inventory change
  if (quantity !== undefined) {
    await prisma.inventoryLog.create({
      data: {
        variantId,
        quantityChange: parseInt(quantity) - variant.quantity,
        reason: "adjustment",
        previousQuantity: variant.quantity,
        newQuantity: parseInt(quantity),
        notes: "Admin adjustment",
        createdBy: req.admin.id,
      },
    });
  }

  // Format variant with attributes
  const { formatVariantWithAttributes } = await import(
    "../utils/variant-attributes.js"
  );
  const formattedVariant = formatVariantWithAttributes(updatedVariant);

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variant: formattedVariant },
        "Product variant updated successfully"
      )
    );
});

// Delete product variant
export const deleteProductVariant = asyncHandler(async (req, res, next) => {
  const { variantId } = req.params;
  const { force } = req.query; // Add force parameter

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      images: true, // Include variant images
      product: {
        select: {
          id: true,
          variants: {
            select: { id: true },
          },
        },
      },
      orderItems: true,
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Prevent deleting if it's the only variant for the product
  if (variant.product.variants.length === 1) {
    throw new ApiError(400, "Cannot delete the only variant for this product");
  }

  // If variant has order items and force is not true, return a message
  if (variant.orderItems.length > 0 && force !== "true") {
    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "Product variant has associated orders and cannot be deleted. Use force=true to delete permanently."
        )
      );
    return;
  }

  // Delete variant with transaction if needed
  if (variant.orderItems.length > 0 && force === "true") {
    await prisma.$transaction(async (tx) => {
      // Delete variant images from S3 first
      if (variant.images && variant.images.length > 0) {
        for (const variantImage of variant.images) {
          try {
            await deleteFromS3(variantImage.url);
            console.log(`Deleted variant image from S3: ${variantImage.url}`);
          } catch (error) {
            console.error(
              `Failed to delete variant image from S3: ${variantImage.url}`,
              error
            );
          }
        }
      }

      // Delete order items associated with this variant
      await tx.orderItem.deleteMany({
        where: { variantId },
      });

      // Then delete the variant
      await tx.productVariant.delete({
        where: { id: variantId },
      });
    });
  } else {
    // Delete variant images from S3 first
    if (variant.images && variant.images.length > 0) {
      for (const variantImage of variant.images) {
        try {
          await deleteFromS3(variantImage.url);
          console.log(`Deleted variant image from S3: ${variantImage.url}`);
        } catch (error) {
          console.error(
            `Failed to delete variant image from S3: ${variantImage.url}`,
            error
          );
        }
      }
    }

    // Just delete the variant if no orders
    await prisma.productVariant.delete({
      where: { id: variantId },
    });
  }

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Product variant deleted successfully"));
});

// Get all flavors
export const getFlavors = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
  let where = {};

  if (search) {
    where = {
      name: {
        contains: search,
        mode: "insensitive",
      },
    };
  }

  const flavors = await prisma.color.findMany({
    where,
    orderBy: { name: "asc" },
  });

  // Format flavors with proper image URLs
  const formattedFlavors = flavors.map((flavor) => ({
    ...flavor,
    image: flavor.image ? getFileUrl(flavor.image) : null,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { flavors: formattedFlavors },
        "Flavors fetched successfully"
      )
    );
});

// Create a new flavor
export const createFlavor = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Flavor name is required");
  }

  // Check if flavor already exists
  const existingFlavor = await prisma.color.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });

  if (existingFlavor) {
    throw new ApiError(409, "Flavor already exists");
  }

  let imageUrl = null;

  // Process image if provided
  if (req.file) {
    try {
      imageUrl = await processAndUploadImage(req.file, "flavors");
      console.log(`Uploaded flavor image to S3: ${imageUrl}`);
    } catch (error) {
      console.error("Error uploading flavor image:", error);
      throw new ApiError(
        500,
        `Failed to upload flavor image: ${error.message}`
      );
    }
  }

  // Create flavor
  const flavor = await prisma.color.create({
    data: {
      name,
      description,
      image: imageUrl,
    },
  });

  // Format response with image URL
  const formattedFlavor = {
    ...flavor,
    image: flavor.image ? getFileUrl(flavor.image) : null,
  };

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { color: formattedFlavor },
        "Flavor created successfully"
      )
    );
});

// Update flavor
export const updateFlavor = asyncHandler(async (req, res, next) => {
  const { colorId } = req.params;
  const { name, description } = req.body;

  // Check if flavor exists
  const flavor = await prisma.color.findUnique({
    where: { id: colorId },
  });

  if (!flavor) {
    throw new ApiError(404, "Flavor not found");
  }

  // Check if name already exists (if changing)
  if (name && name !== flavor.name) {
    const existingFlavor = await prisma.color.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        id: { not: colorId },
      },
    });

    if (existingFlavor) {
      throw new ApiError(409, "Flavor name already exists");
    }
  }

  // Prepare update data
  const updateData = {
    ...(name && { name }),
    ...(description !== undefined && { description }),
  };

  // Handle image update
  if (req.file) {
    try {
      // Delete old image if exists
      if (flavor.image) {
        console.log(`Deleting old flavor image from S3: ${flavor.image}`);
        await deleteFromS3(flavor.image);
      }

      // Upload new image and add to update data
      const imageUrl = await processAndUploadImage(req.file, "flavors");
      updateData.image = imageUrl;
    } catch (error) {
      console.error("Error handling flavor image:", error);
      throw new ApiError(
        500,
        `Failed to update flavor image: ${error.message}`
      );
    }
  }

  // Update flavor
  const updatedFlavor = await prisma.color.update({
    where: { id: colorId },
    data: updateData,
  });

  // Format response with image URL
  const formattedFlavor = {
    ...updatedFlavor,
    image: updatedFlavor.image ? getFileUrl(updatedFlavor.image) : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { color: formattedFlavor },
        "Flavor updated successfully"
      )
    );
});

// Delete flavor
export const deleteFlavor = asyncHandler(async (req, res, next) => {
  const { colorId } = req.params;
  const { force } = req.query;

  // Check if flavor exists
  const flavor = await prisma.color.findUnique({
    where: { id: colorId },
    include: {
      productVariants: true,
    },
  });

  if (!flavor) {
    throw new ApiError(404, "Flavor not found");
  }

  // If flavor is in use and force is not true, give user option to force delete
  if (flavor.productVariants.length > 0 && force !== "true") {
    return res.status(400).json(
      new ApiResponsive(
        400,
        {
          canForceDelete: true,
          variantCount: flavor.productVariants.length,
        },
        `Flavor is being used by ${flavor.productVariants.length} product variants. Use force=true to remove it from all variants and delete.`
      )
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // If force delete, remove flavor from all variants first
      if (flavor.productVariants.length > 0) {
        await tx.productVariant.updateMany({
          where: { colorId },
          data: { colorId: null },
        });
      }

      // Delete flavor image if exists
      if (flavor.image) {
        console.log(`Deleting flavor image from S3: ${flavor.image}`);
        await deleteFromS3(flavor.image);
      }

      // Delete flavor
      await tx.flavor.delete({
        where: { id: colorId },
      });
    });

    res
      .status(200)
      .json(new ApiResponsive(200, {}, "Flavor deleted successfully"));
  } catch (error) {
    console.error("Error deleting color:", error);
    throw new ApiError(500, `Failed to delete color: ${error.message}`);
  }
});

// Get all weights
export const getWeights = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
  let where = {};

  if (search) {
    // Try to match value (as string) or unit
    where = {
      OR: [
        {
          value: {
            equals: isNaN(Number(search)) ? undefined : Number(search),
          },
        },
        {
          unit: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    };
  }

  const weights = await prisma.size.findMany({
    where,
    orderBy: { value: "asc" },
  });

  // Format weights with display value
  const formattedWeights = weights.map((weight) => ({
    ...weight,
    display: `${weight.value}${weight.unit}`,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { weights: formattedWeights },
        "Weights fetched successfully"
      )
    );
});

// Create a new weight
export const createWeight = asyncHandler(async (req, res, next) => {
  const { value, unit } = req.body;

  if (!value || !unit) {
    throw new ApiError(400, "Weight value and unit are required");
  }

  // Check if weight already exists
  const existingWeight = await prisma.size.findFirst({
    where: {
      value: parseFloat(value),
      unit,
    },
  });

  if (existingWeight) {
    throw new ApiError(409, "Weight already exists");
  }

  // Create weight
  const weight = await prisma.size.create({
    data: {
      value: parseFloat(value),
      unit,
    },
  });

  res
    .status(201)
    .json(new ApiResponsive(201, { weight }, "Weight created successfully"));
});

// Update weight
export const updateWeight = asyncHandler(async (req, res, next) => {
  const { sizeId } = req.params;
  const { value, unit } = req.body;

  // Check if weight exists
  const weight = await prisma.size.findUnique({
    where: { id: sizeId },
  });

  if (!weight) {
    throw new ApiError(404, "Weight not found");
  }

  // Check if updated weight already exists
  if (
    (value !== undefined || unit !== undefined) &&
    (parseFloat(value) !== weight.value || unit !== weight.unit)
  ) {
    const existingWeight = await prisma.size.findFirst({
      where: {
        value: value !== undefined ? parseFloat(value) : weight.value,
        unit: unit || weight.unit,
        id: { not: sizeId },
      },
    });

    if (existingWeight) {
      throw new ApiError(409, "Weight already exists");
    }
  }

  // Update weight
  const updatedWeight = await prisma.size.update({
    where: { id: sizeId },
    data: {
      ...(value !== undefined && { value: parseFloat(value) }),
      ...(unit && { unit }),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { size: updatedWeight },
        "Weight updated successfully"
      )
    );
});

// Delete weight
export const deleteWeight = asyncHandler(async (req, res, next) => {
  const { sizeId } = req.params;
  const { force } = req.query;

  // Check if weight exists
  const weight = await prisma.size.findUnique({
    where: { id: sizeId },
    include: {
      productVariants: true,
    },
  });

  if (!weight) {
    throw new ApiError(404, "Weight not found");
  }

  // If weight is in use and force is not true, give user option to force delete
  if (weight.productVariants.length > 0 && force !== "true") {
    return res.status(400).json(
      new ApiResponsive(
        400,
        {
          canForceDelete: true,
          variantCount: weight.productVariants.length,
        },
        `Weight is being used by ${weight.productVariants.length} product variants. Use force=true to remove it from all variants and delete.`
      )
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      // If force delete, remove weight from all variants first
      if (weight.productVariants.length > 0) {
        await tx.productVariant.updateMany({
          where: { sizeId },
          data: { sizeId: null },
        });
      }

      // Delete weight
      await tx.weight.delete({
        where: { id: sizeId },
      });
    });

    res
      .status(200)
      .json(new ApiResponsive(200, {}, "Weight deleted successfully"));
  } catch (error) {
    console.error("Error deleting size:", error);
    throw new ApiError(500, `Failed to delete size: ${error.message}`);
  }
});

// Upload variant image
export const uploadVariantImage = asyncHandler(async (req, res, next) => {
  const { variantId } = req.params;
  const { isPrimary, order } = req.body;

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      images: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  if (!req.file) {
    throw new ApiError(400, "Image file is required");
  }

  try {
    // Upload to S3 using existing function
    const imageUrl = await processAndUploadImage(
      req.file,
      `variants/${variantId}`
    );

    // Handle image creation with retry logic for race conditions
    let retryCount = 0;
    const maxRetries = 3;
    let newImage;

    while (retryCount < maxRetries) {
      try {
        newImage = await prisma.$transaction(async (tx) => {
          // Get fresh variant data
          const currentVariant = await tx.productVariant.findUnique({
            where: { id: variantId },
            include: {
              images: {
                orderBy: { order: "asc" },
              },
            },
          });

          if (!currentVariant) {
            throw new Error("Variant not found");
          }

          // Determine if this should be primary
          // Priority 1: Explicit request to make it primary (isPrimary = true)
          // Priority 2: If no existing images and no explicit isPrimary value sent (undefined/null)
          const explicitlyPrimary = isPrimary === "true" || isPrimary === true;
          const explicitlyNotPrimary =
            isPrimary === "false" || isPrimary === false;
          const isFirstImageEver = currentVariant.images.length === 0;
          const noPrimarySpecified =
            isPrimary === undefined || isPrimary === null || isPrimary === "";

          // Only set as primary if explicitly requested, OR if it's the first image and no explicit value was sent
          const shouldBePrimary =
            explicitlyPrimary ||
            (isFirstImageEver && noPrimarySpecified && !explicitlyNotPrimary);

          // Determine the correct order first
          let imageOrder;

          if (shouldBePrimary) {
            // Primary images always go to order 0
            imageOrder = 0;

            // Shift all existing images up by 1 ONLY if we have existing images
            if (currentVariant.images.length > 0) {
              await tx.productVariantImage.updateMany({
                where: { variantId },
                data: {
                  order: { increment: 1 },
                },
              });
              console.log(
                `🔑 Shifted ${currentVariant.images.length} existing images up by 1`
              );
            }

            // Unset primary flag from all other images
            const primaryImages = currentVariant.images.filter(
              (img) => img.isPrimary
            );
            if (primaryImages.length > 0) {
              await tx.productVariantImage.updateMany({
                where: {
                  variantId,
                  isPrimary: true,
                },
                data: { isPrimary: false },
              });
              console.log(
                `🔑 Removed primary flag from ${primaryImages.length} existing images`
              );
            }
          } else {
            // Non-primary images go to the end
            imageOrder = currentVariant.images.length;
            console.log(`📎 Non-primary image set to order ${imageOrder}`);
          }

          // Create the new image
          const createdImage = await tx.productVariantImage.create({
            data: {
              variantId,
              url: imageUrl,
              alt: req.body.alt || null,
              isPrimary: shouldBePrimary,
              order: imageOrder,
            },
          });

          return createdImage;
        });

        // If we reach here, transaction succeeded
        break;
      } catch (error) {
        retryCount++;
        console.log(`⚠️ Transaction attempt ${retryCount} failed:`, error.code);

        if (error.code === "P2034" && retryCount < maxRetries) {
          // Wait a bit before retrying for deadlock/write conflict
          await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));
          console.log(
            `🔄 Retrying transaction (attempt ${retryCount + 1}/${maxRetries})`
          );
          continue;
        } else {
          throw error;
        }
      }
    }

    res
      .status(201)
      .json(
        new ApiResponsive(
          201,
          { image: newImage },
          "Variant image uploaded successfully"
        )
      );
  } catch (error) {
    console.error("Error uploading variant image:", error);
    throw new ApiError(500, "Failed to upload variant image");
  }
});

// Delete variant image
export const deleteVariantImage = asyncHandler(async (req, res, next) => {
  const { imageId } = req.params;

  // Check if image exists
  const image = await prisma.productVariantImage.findUnique({
    where: { id: imageId },
    include: {
      variant: {
        select: {
          id: true,
          images: {
            select: { id: true, isPrimary: true, url: true, order: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!image) {
    throw new ApiError(404, "Variant image not found");
  }

  try {
    // Delete image from S3
    console.log(`Deleting variant image from S3: ${image.url}`);
    await deleteFromS3(image.url);

    // Use transaction to handle deletion and reordering
    await prisma.$transaction(async (tx) => {
      // Get the order of the image being deleted
      const deletedImageOrder = image.order;
      const isPrimary = image.isPrimary;

      // Delete image record from database
      await tx.productVariantImage.delete({
        where: { id: imageId },
      });

      // Adjust order of remaining images
      await tx.productVariantImage.updateMany({
        where: {
          variantId: image.variant.id,
          order: { gt: deletedImageOrder },
        },
        data: {
          order: { decrement: 1 },
        },
      });

      // If deleted image was primary, set the first remaining image as primary
      if (isPrimary) {
        const remainingImages = image.variant.images.filter(
          (img) => img.id !== imageId
        );
        if (remainingImages.length > 0) {
          // Find the image that will be at order 0 after reordering
          const newPrimaryImage =
            remainingImages.find(
              (img) =>
                img.order === 0 ||
                (img.order > deletedImageOrder && img.order - 1 === 0)
            ) || remainingImages[0];

          await tx.productVariantImage.update({
            where: { id: newPrimaryImage.id },
            data: { isPrimary: true },
          });
        }
      }
    });

    res
      .status(200)
      .json(new ApiResponsive(200, {}, "Variant image deleted successfully"));
  } catch (error) {
    console.error("Error deleting variant image:", error);
    throw new ApiError(500, `Failed to delete variant image: ${error.message}`);
  }
});

// Reorder variant images
export const reorderVariantImages = asyncHandler(async (req, res, next) => {
  const { variantId } = req.params;
  const { imageOrders } = req.body; // Array of { imageId, order }

  if (!imageOrders || !Array.isArray(imageOrders)) {
    throw new ApiError(400, "imageOrders array is required");
  }

  // Check if variant exists
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: {
      images: {
        select: { id: true, isPrimary: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!variant) {
    throw new ApiError(404, "Product variant not found");
  }

  // Validate that all imageIds belong to this variant
  const variantImageIds = variant.images.map((img) => img.id);
  const requestImageIds = imageOrders.map((item) => item.imageId);

  const invalidIds = requestImageIds.filter(
    (id) => !variantImageIds.includes(id)
  );

  if (invalidIds.length > 0) {
    throw new ApiError(
      400,
      `Images ${invalidIds.join(", ")} do not belong to this variant`
    );
  }

  try {
    // Use transaction to update all orders atomically
    await prisma.$transaction(async (tx) => {
      // Update each image's order
      for (const { imageId, order } of imageOrders) {
        await tx.productVariantImage.update({
          where: { id: imageId },
          data: { order: parseInt(order) },
        });
      }

      // Ensure primary image is at order 0
      const primaryImage = variant.images.find((img) => img.isPrimary);
      if (primaryImage) {
        const newPrimaryOrder = imageOrders.find(
          (item) => item.imageId === primaryImage.id
        )?.order;

        if (newPrimaryOrder !== undefined && parseInt(newPrimaryOrder) !== 0) {
          // If primary image is not at order 0, we need to adjust
          // Find what image is now at order 0
          const imageAtOrderZero = imageOrders.find(
            (item) => parseInt(item.order) === 0
          );

          if (
            imageAtOrderZero &&
            imageAtOrderZero.imageId !== primaryImage.id
          ) {
            // Set the image at order 0 as primary
            await tx.productVariantImage.updateMany({
              where: { variantId },
              data: { isPrimary: false },
            });

            await tx.productVariantImage.update({
              where: { id: imageAtOrderZero.imageId },
              data: { isPrimary: true },
            });
          }
        }
      }
    });

    res
      .status(200)
      .json(
        new ApiResponsive(200, {}, "Variant images reordered successfully")
      );
  } catch (error) {
    console.error("Error reordering variant images:", error);
    throw new ApiError(
      500,
      `Failed to reorder variant images: ${error.message}`
    );
  }
});

// Handle bulk variant operations (add, update, delete multiple variants)
export const bulkVariantOperations = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { variants, variantsToDelete } = req.body;

  // Validate request
  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Process operations in a transaction
  const result = await prisma.$transaction(async (tx) => {
    let updatedVariants = [];

    // 1. Delete variants if specified
    if (
      variantsToDelete &&
      Array.isArray(variantsToDelete) &&
      variantsToDelete.length > 0
    ) {
      // Validate that these variants belong to this product
      const variantsToDeleteCount = await tx.productVariant.count({
        where: {
          id: { in: variantsToDelete },
          productId: productId,
        },
      });

      if (variantsToDeleteCount !== variantsToDelete.length) {
        throw new ApiError(
          400,
          "Some variants to delete do not belong to this product"
        );
      }

      await tx.productVariant.deleteMany({
        where: {
          id: { in: variantsToDelete },
        },
      });

      console.log(`Deleted ${variantsToDeleteCount} variants`);
    }

    // 2. Update or create variants
    if (variants && Array.isArray(variants) && variants.length > 0) {
      // Create base SKU for auto-generation if needed
      let baseSku = "";
      if (variants.some((v) => !v.sku || v.sku.trim() === "")) {
        const namePart = product.name
          .substring(0, 3)
          .toUpperCase()
          .replace(/\s+/g, "");
        const timestamp = Date.now().toString().slice(-4);
        baseSku = `${namePart}${timestamp}`;
      }

      for (const variant of variants) {
        if (
          variant.id &&
          !variant.id.startsWith("new-") &&
          !variant.id.startsWith("field")
        ) {
          // Existing variant - update it
          try {
            // Prepare update data
            const updateData = {
              name: variant.name,
              sku: variant.sku,
              price: parseFloat(variant.price || 0),
              salePrice: variant.salePrice
                ? parseFloat(variant.salePrice)
                : null,
              quantity: parseInt(variant.quantity || variant.stock || 0),
              isActive:
                variant.isActive !== undefined ? variant.isActive : true,
              redirectUrl: variant.redirectUrl !== undefined ? variant.redirectUrl : undefined,
            };

            // Handle attributes if provided
            if (
              variant.attributeValueIds &&
              Array.isArray(variant.attributeValueIds) &&
              variant.attributeValueIds.length > 0
            ) {
              // Delete existing attribute mappings
              await tx.variantAttributeValue.deleteMany({
                where: { variantId: variant.id },
              });

              // Create new attribute mappings
              updateData.attributes = {
                create: variant.attributeValueIds.map((attributeValueId) => ({
                  attributeValueId,
                })),
              };
            }

            const updatedVariant = await tx.productVariant.update({
              where: { id: variant.id },
              data: updateData,
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
              },
            });

            updatedVariants.push(updatedVariant);
          } catch (error) {
            // If variant not found, create a new one instead
            if (error.code === "P2025") {
              console.log(`Variant ${variant.id} not found, creating new`);
              // Prepare create data
              const createData = {
                productId,
                name: variant.name,
                sku:
                  variant.sku ||
                  `${baseSku}-${Math.floor(Math.random() * 1000)}`,
                price: parseFloat(variant.price || 0),
                salePrice: variant.salePrice
                  ? parseFloat(variant.salePrice)
                  : null,
                quantity: parseInt(variant.quantity || variant.stock || 0),
                isActive:
                  variant.isActive !== undefined ? variant.isActive : true,
                redirectUrl: variant.redirectUrl || null,
              };

              // Handle attributes if provided
              if (
                variant.attributeValueIds &&
                Array.isArray(variant.attributeValueIds) &&
                variant.attributeValueIds.length > 0
              ) {
                createData.attributes = {
                  create: variant.attributeValueIds.map((attributeValueId) => ({
                    attributeValueId,
                  })),
                };
              }

              const newVariant = await tx.productVariant.create({
                data: createData,
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
                },
              });

              updatedVariants.push(newVariant);
            } else {
              throw error;
            }
          }
        } else {
          // New variant - create it
          // Prepare create data
          const createData = {
            productId,
            name: variant.name,
            sku:
              variant.sku || `${baseSku}-${Math.floor(Math.random() * 1000)}`,
            price: parseFloat(variant.price || 0),
            salePrice: variant.salePrice ? parseFloat(variant.salePrice) : null,
            quantity: parseInt(variant.quantity || variant.stock || 0),
            isActive: variant.isActive !== undefined ? variant.isActive : true,
            redirectUrl: variant.redirectUrl || null,
          };

          // Handle attributes if provided
          if (
            variant.attributeValueIds &&
            Array.isArray(variant.attributeValueIds) &&
            variant.attributeValueIds.length > 0
          ) {
            createData.attributes = {
              create: variant.attributeValueIds.map((attributeValueId) => ({
                attributeValueId,
              })),
            };
          }

          const newVariant = await tx.productVariant.create({
            data: createData,
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
            },
          });

          updatedVariants.push(newVariant);
        }
      }
    }

    // Return all variants for this product after operations
    return await tx.productVariant.findMany({
      where: { productId },
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
      },
    });
  });

  // Format the response
  const formattedVariants = result.map((variant) => ({
    ...variant,
    color: variant.color
      ? {
        ...variant.color,
        image: variant.color.image ? getFileUrl(variant.color.image) : null,
      }
      : null,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { variants: formattedVariants },
        "Product variants updated successfully"
      )
    );
});

// Set variant image as primary
export const setVariantImageAsPrimary = asyncHandler(async (req, res, next) => {
  const { imageId } = req.params;

  // Check if image exists
  const image = await prisma.productVariantImage.findUnique({
    where: { id: imageId },
    include: {
      variant: {
        select: {
          id: true,
          images: {
            select: { id: true, isPrimary: true, order: true },
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!image) {
    throw new ApiError(404, "Variant image not found");
  }

  // If already primary, no action needed
  if (image.isPrimary) {
    return res
      .status(200)
      .json(new ApiResponsive(200, {}, "Image is already set as primary"));
  }

  try {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Use a transaction to ensure all database operations complete together
        await prisma.$transaction(async (tx) => {
          // Get fresh image data to ensure we have current state
          const currentImage = await tx.productVariantImage.findUnique({
            where: { id: imageId },
            include: {
              variant: {
                select: {
                  id: true,
                  images: {
                    select: { id: true, isPrimary: true, order: true },
                    orderBy: { order: "asc" },
                  },
                },
              },
            },
          });

          if (!currentImage) {
            throw new Error("Image not found");
          }

          const currentOrder = currentImage.order;
          const variantId = currentImage.variant.id;

          // Step 1: Remove primary flag from all images in this variant
          await tx.productVariantImage.updateMany({
            where: {
              variantId,
              isPrimary: true,
            },
            data: { isPrimary: false },
          });

          // Step 2: If the image is not at order 0, move it to order 0
          if (currentOrder !== 0) {
            // Shift all images with order < currentOrder up by 1
            await tx.productVariantImage.updateMany({
              where: {
                variantId,
                order: { lt: currentOrder },
              },
              data: {
                order: { increment: 1 },
              },
            });

            // Set this image to order 0 and primary
            await tx.productVariantImage.update({
              where: { id: imageId },
              data: {
                order: 0,
                isPrimary: true,
              },
            });
          } else {
            // Image is already at order 0, just set as primary
            await tx.productVariantImage.update({
              where: { id: imageId },
              data: { isPrimary: true },
            });

            console.log(`🔑 Set image as primary (already at order 0)`);
          }
        });

        // Transaction succeeded, break the retry loop
        break;
      } catch (error) {
        retryCount++;

        if (error.code === "P2034" && retryCount < maxRetries) {
          // Wait a bit before retrying for deadlock/write conflict
          await new Promise((resolve) => setTimeout(resolve, 100 * retryCount));

          continue;
        } else {
          throw error;
        }
      }
    }

    res
      .status(200)
      .json(
        new ApiResponsive(200, {}, "Variant image set as primary successfully")
      );
  } catch (error) {
    console.error("Error setting variant image as primary:", error);
    throw new ApiError(
      500,
      `Failed to set variant image as primary: ${error.message}`
    );
  }
});
