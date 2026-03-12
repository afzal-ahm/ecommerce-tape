import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import slugify from "slugify";

// Get all sub-categories for a category
export const getSubCategoriesByCategory = asyncHandler(
  async (req, res, next) => {
    const { categoryId } = req.params;

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new ApiError(404, "Category not found");
    }

    const subCategories = await prisma.subCategory.findMany({
      where: { categoryId },
      orderBy: { name: "asc" },
    });

    // Format with image URLs
    const formattedSubCategories = subCategories.map((sub) => ({
      ...sub,
      image: sub.image ? getFileUrl(sub.image) : null,
    }));

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          { subCategories: formattedSubCategories },
          "Sub-categories fetched successfully"
        )
      );
  }
);

// Get sub-category by ID
export const getSubCategoryById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const subCategory = await prisma.subCategory.findUnique({
    where: { id },
    include: {
      category: true,
      products: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!subCategory) {
    throw new ApiError(404, "Sub-category not found");
  }

  // Format with image URL
  const formattedSubCategory = {
    ...subCategory,
    image: subCategory.image ? getFileUrl(subCategory.image) : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { subCategory: formattedSubCategory },
        "Sub-category fetched successfully"
      )
    );
});

// Create sub-category
export const createSubCategory = asyncHandler(async (req, res, next) => {
  const { categoryId } = req.params;
  const { name, description } = req.body;

  if (!name) {
    throw new ApiError(400, "Name is required");
  }

  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new ApiError(404, "Category not found");
  }

  // Generate slug
  const slug = slugify(name, { lower: true, strict: true });

  // Check if slug already exists for this category
  const existingSubCategory = await prisma.subCategory.findUnique({
    where: {
      categoryId_slug: {
        categoryId,
        slug,
      },
    },
  });

  if (existingSubCategory) {
    throw new ApiError(400, "Sub-category with this name already exists");
  }

  // Handle image upload if provided
  let imageUrl = null;
  if (req.file) {
    try {
      imageUrl = await processAndUploadImage(req.file, "sub-categories");
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new ApiError(500, "Failed to upload image");
    }
  }

  const subCategory = await prisma.subCategory.create({
    data: {
      categoryId,
      name,
      description,
      slug,
      image: imageUrl,
    },
    include: {
      category: true,
    },
  });

  // Format with image URL
  const formattedSubCategory = {
    ...subCategory,
    image: subCategory.image ? getFileUrl(subCategory.image) : null,
  };

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { subCategory: formattedSubCategory },
        "Sub-category created successfully"
      )
    );
});

// Update sub-category
export const updateSubCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, isActive } = req.body;

  const existingSubCategory = await prisma.subCategory.findUnique({
    where: { id },
  });

  if (!existingSubCategory) {
    throw new ApiError(404, "Sub-category not found");
  }

  // Generate new slug if name is being updated
  let slug = existingSubCategory.slug;
  if (name && name !== existingSubCategory.name) {
    slug = slugify(name, { lower: true, strict: true });

    // Check if new slug already exists for this category
    const slugExists = await prisma.subCategory.findUnique({
      where: {
        categoryId_slug: {
          categoryId: existingSubCategory.categoryId,
          slug,
        },
      },
    });

    if (slugExists && slugExists.id !== id) {
      throw new ApiError(400, "Sub-category with this name already exists");
    }
  }

  // Handle image upload if provided
  let imageUrl = existingSubCategory.image;
  if (req.file) {
    try {
      // Delete old image if exists
      if (existingSubCategory.image) {
        await deleteFromS3(existingSubCategory.image);
      }
      imageUrl = await processAndUploadImage(req.file, "sub-categories");
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new ApiError(500, "Failed to upload image");
    }
  }

  const subCategory = await prisma.subCategory.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(slug && { slug }),
      ...(isActive !== undefined && { isActive }),
      ...(imageUrl !== null && { image: imageUrl }),
    },
    include: {
      category: true,
    },
  });

  // Format with image URL
  const formattedSubCategory = {
    ...subCategory,
    image: subCategory.image ? getFileUrl(subCategory.image) : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { subCategory: formattedSubCategory },
        "Sub-category updated successfully"
      )
    );
});

// Delete sub-category
export const deleteSubCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const subCategory = await prisma.subCategory.findUnique({
    where: { id },
    include: {
      products: true,
    },
  });

  if (!subCategory) {
    throw new ApiError(404, "Sub-category not found");
  }

  // Check if sub-category is being used by any products
  if (subCategory.products.length > 0) {
    throw new ApiError(
      400,
      "Cannot delete sub-category. It is being used by products."
    );
  }

  // Delete image if exists
  if (subCategory.image) {
    await deleteFromS3(subCategory.image);
  }

  await prisma.subCategory.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, null, "Sub-category deleted successfully"));
});
