import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";
import { createSlug } from "../helper/Slug.js";

// ---------------------- PUBLIC ROUTES ---------------------- //

// Get all categories with their subcategories
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Format the response with image URLs
  const formattedCategories = categories.map((category) => ({
    ...category,
    image: category.image ? getFileUrl(category.image) : null,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { categories: formattedCategories },
        "Categories fetched successfully"
      )
    );
});

// Get all categories with their sub-categories for navigation
export const getCategoriesWithSubCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    include: {
      subCategories: {
        where: {
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      },
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Format the response with image URLs
  const formattedCategories = categories.map((category) => ({
    ...category,
    image: category.image ? getFileUrl(category.image) : null,
    subCategories: category.subCategories.map((subCat) => ({
      ...subCat,
      image: subCat.image ? getFileUrl(subCat.image) : null,
    })),
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { categories: formattedCategories },
        "Categories with sub-categories fetched successfully"
      )
    );
});

// Get products by category
export const getProductsByCategory = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const {
    page = 1,
    limit = 10,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  // Find the category by slug
  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Get category ID
  const categoryIds = [category.id];

  // Count total products in this category and its subcategories
  const totalProducts = await prisma.product.count({
    where: {
      categories: {
        some: {
          category: {
            id: {
              in: categoryIds,
            },
          },
        },
      },
      isActive: true,
    },
  });

  // Get paginated products
  const products = await prisma.product.findMany({
    where: {
      categories: {
        some: {
          category: {
            id: {
              in: categoryIds,
            },
          },
        },
      },
      isActive: true,
    },
    include: {
      images: {
        where: { isPrimary: true },
        take: 1,
      },
      categories: {
        include: {
          category: true,
        },
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
          images: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: [{ ourProduct: "desc" }, { [sort]: order }],
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

  // Format the response
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

    // Calculate prices
    const basePrice = product.variants.length > 0
      ? Math.min(...product.variants.map((v) => parseFloat(v.salePrice || v.price)))
      : null;
    const regularPrice = product.variants.length > 0
      ? Math.min(...product.variants.map((v) => parseFloat(v.price)))
      : null;
    const hasSale = product.variants.some(v => v.salePrice !== null);

    // Get flash sale data
    const flashSale = flashSaleMap[product.id] || null;
    let flashSalePrice = null;
    if (flashSale && basePrice !== null) {
      const discountAmount = (basePrice * flashSale.discountPercentage) / 100;
      flashSalePrice = Math.round((basePrice - discountAmount) * 100) / 100;
    }

    return {
      ...product,
      category: primaryCategory,
      images: product.images.map((image) => ({
        ...image,
        url: getFileUrl(image.url),
      })),
      // Add fallback image
      image: imageUrl ? getFileUrl(imageUrl) : null,
      basePrice,
      regularPrice,
      hasSale,
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
        category,
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

// ---------------------- ADMIN ROUTES ---------------------- //

// Get all categories for admin (including inactive ones)
export const getAdminCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Format the response with image URLs
  const formattedCategories = categories.map((category) => ({
    ...category,
    image: category.image ? getFileUrl(category.image) : null,
  }));

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { categories: formattedCategories },
        "Categories fetched successfully"
      )
    );
});

// Get category by ID
export const getCategoryById = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Format the response with image URL
  const formattedCategory = {
    ...category,
    image: category.image ? getFileUrl(category.image) : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { category: formattedCategory },
        "Category fetched successfully"
      )
    );
});

// Create a new category
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  // Generate slug from name
  const slug = createSlug(name);

  // Check if category with this slug already exists
  const existingCategory = await prisma.category.findUnique({
    where: { slug },
  });

  if (existingCategory) {
    throw new ApiError(409, "Category with this name already exists");
  }

  // Parent-child relationships removed for simplicity

  // Process image if uploaded
  let imageUrl = null;
  if (req.file) {
    imageUrl = await processAndUploadImage(req.file);
  }

  // Create category
  const category = await prisma.category.create({
    data: {
      name,
      description,
      slug,
      image: imageUrl,
    },
  });

  res.status(201).json(
    new ApiResponsive(
      201,
      {
        category: {
          ...category,
          image: imageUrl ? getFileUrl(imageUrl) : null,
        },
      },
      "Category created successfully"
    )
  );
});

// Update category
export const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, description } = req.body;

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Prepare update data
  const updateData = {};

  // Update slug if name is changed
  if (name && name !== category.name) {
    const newSlug = createSlug(name);

    // Check if new slug is already taken
    const existingCategory = await prisma.category.findFirst({
      where: {
        slug: newSlug,
        id: { not: categoryId },
      },
    });

    if (existingCategory) {
      throw new ApiError(409, "Category with this name already exists");
    }

    updateData.name = name;
    updateData.slug = newSlug;
  }

  // Update description if provided
  if (description !== undefined) {
    updateData.description = description;
  }

  // Parent-child relationships removed for simplicity

  // Process new image if uploaded
  if (req.file) {
    // Delete old image if exists
    if (category.image) {
      await deleteFromS3(category.image);
    }

    // Upload new image
    updateData.image = await processAndUploadImage(req.file);
  }

  // Update category
  const updatedCategory = await prisma.category.update({
    where: { id: categoryId },
    data: updateData,
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        category: {
          ...updatedCategory,
          image: updatedCategory.image
            ? getFileUrl(updatedCategory.image)
            : null,
        },
      },
      "Category updated successfully"
    )
  );
});

// Delete category
export const deleteCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { force } = req.query; // Add force parameter

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: {
      products: true,
    },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Remove parent-child check since we simplified the schema

  // Check if category has products when force is not true
  if (category.products.length > 0 && force !== "true") {
    return res.status(400).json(
      new ApiResponsive(
        400,
        {
          canForceDelete: true,
          productCount: category.products.length,
        },
        `Cannot delete category. It has ${category.products.length} products associated with it. Use force=true to move products to Uncategorized category.`
      )
    );
  }

  try {
    // When force is true, handle the case with products
    if (force === "true") {
      await prisma.$transaction(async (tx) => {
        // Handle products - remove them from this category or reassign to default
        if (category.products.length > 0) {
          // Find or create default category
          let defaultCategory = await tx.category.findFirst({
            where: { name: "Uncategorized" },
          });

          if (!defaultCategory) {
            defaultCategory = await tx.category.create({
              data: {
                name: "Uncategorized",
                slug: "uncategorized",
                description:
                  "Default category for products without specific category",
                isDefault: true,
              },
            });
          }

          // Reassign all products to default category
          await tx.productCategory.updateMany({
            where: { categoryId },
            data: { categoryId: defaultCategory.id },
          });
        }

        // Delete category image if exists
        if (category.image) {
          await deleteFromS3(category.image);
        }

        // Delete the category
        await tx.category.delete({
          where: { id: categoryId },
        });
      });
    } else {
      // Standard deletion (no force)
      // Delete category image if exists
      if (category.image) {
        await deleteFromS3(category.image);
      }

      // Delete the category
      await prisma.category.delete({
        where: { id: categoryId },
      });
    }

    res
      .status(200)
      .json(new ApiResponsive(200, {}, "Category deleted successfully"));
  } catch (error) {
    console.error("Error deleting category:", error);
    throw new ApiError(500, `Failed to delete category: ${error.message}`);
  }
});
