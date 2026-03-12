import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all product sections
export const getAllProductSections = asyncHandler(async (req, res, next) => {
  const sections = await prisma.productSection.findMany({
    orderBy: { displayOrder: "asc" },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true }, take: 1 },
              variants: { where: { isActive: true }, take: 1 },
            },
          },
        },
        orderBy: { displayOrder: "asc" },
        take: 15, // Limit to maxProducts
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { sections }, "Product sections fetched successfully")
    );
});

// Get product section by ID
export const getProductSectionById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const section = await prisma.productSection.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
              variants: { where: { isActive: true } },
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!section) {
    throw new ApiError(404, "Product section not found");
  }

  res
    .status(200)
    .json(
      new ApiResponsive(200, { section }, "Product section fetched successfully")
    );
});

// Create product section
export const createProductSection = asyncHandler(async (req, res, next) => {
  const { name, slug, description, icon, color, displayOrder, maxProducts } =
    req.body;

  if (!name || !slug) {
    throw new ApiError(400, "Name and slug are required");
  }

  // Check if slug already exists
  const existingSection = await prisma.productSection.findUnique({
    where: { slug },
  });

  if (existingSection) {
    throw new ApiError(400, "Section with this slug already exists");
  }

  const section = await prisma.productSection.create({
    data: {
      name,
      slug,
      description,
      icon,
      color,
      displayOrder: displayOrder || 0,
      maxProducts: maxProducts || 15,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(201, { section }, "Product section created successfully")
    );
});

// Update product section
export const updateProductSection = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, slug, description, icon, color, displayOrder, maxProducts, isActive } =
    req.body;

  const existingSection = await prisma.productSection.findUnique({
    where: { id },
  });

  if (!existingSection) {
    throw new ApiError(404, "Product section not found");
  }

  // Check if slug is being changed and if it already exists
  if (slug && slug !== existingSection.slug) {
    const slugExists = await prisma.productSection.findUnique({
      where: { slug },
    });
    if (slugExists) {
      throw new ApiError(400, "Section with this slug already exists");
    }
  }

  const section = await prisma.productSection.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(slug && { slug }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(color !== undefined && { color }),
      ...(displayOrder !== undefined && { displayOrder }),
      ...(maxProducts !== undefined && { maxProducts }),
      ...(isActive !== undefined && { isActive }),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { section }, "Product section updated successfully")
    );
});

// Delete product section
export const deleteProductSection = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const section = await prisma.productSection.findUnique({
    where: { id },
  });

  if (!section) {
    throw new ApiError(404, "Product section not found");
  }

  await prisma.productSection.delete({
    where: { id },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, null, "Product section deleted successfully"));
});

// Add product to section
export const addProductToSection = asyncHandler(async (req, res, next) => {
  const { sectionId } = req.params;
  const { productId, displayOrder } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Check if section exists and get maxProducts
  const section = await prisma.productSection.findUnique({
    where: { id: sectionId },
    include: {
      items: true,
    },
  });

  if (!section) {
    throw new ApiError(404, "Product section not found");
  }

  // Check if product is already in section
  const existingItem = await prisma.productSectionItem.findUnique({
    where: {
      productSectionId_productId: {
        productSectionId: sectionId,
        productId,
      },
    },
  });

  if (existingItem) {
    throw new ApiError(400, "Product is already in this section");
  }

  // Check if section has reached maxProducts limit
  if (section.items.length >= section.maxProducts) {
    throw new ApiError(
      400,
      `Section has reached maximum limit of ${section.maxProducts} products`
    );
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const item = await prisma.productSectionItem.create({
    data: {
      productSectionId: sectionId,
      productId,
      displayOrder: displayOrder || section.items.length,
    },
    include: {
      product: {
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          variants: { where: { isActive: true }, take: 1 },
        },
      },
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(201, { item }, "Product added to section successfully")
    );
});

// Remove product from section
export const removeProductFromSection = asyncHandler(async (req, res, next) => {
  const { sectionId, productId } = req.params;

  const item = await prisma.productSectionItem.findUnique({
    where: {
      productSectionId_productId: {
        productSectionId: sectionId,
        productId,
      },
    },
  });

  if (!item) {
    throw new ApiError(404, "Product not found in this section");
  }

  await prisma.productSectionItem.delete({
    where: {
      productSectionId_productId: {
        productSectionId: sectionId,
        productId,
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, null, "Product removed from section successfully")
    );
});

// Update product order in section
export const updateProductOrderInSection = asyncHandler(
  async (req, res, next) => {
    const { sectionId } = req.params;
    const { productOrders } = req.body; // Array of { productId, displayOrder }

    if (!Array.isArray(productOrders)) {
      throw new ApiError(400, "productOrders must be an array");
    }

    // Update all product orders
    const updatePromises = productOrders.map(({ productId, displayOrder }) =>
      prisma.productSectionItem.update({
        where: {
          productSectionId_productId: {
            productSectionId: sectionId,
            productId,
          },
        },
        data: { displayOrder },
      })
    );

    await Promise.all(updatePromises);

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          null,
          "Product order updated successfully"
        )
      );
  }
);








