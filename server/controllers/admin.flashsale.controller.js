import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { getFileUrl } from "../utils/deleteFromS3.js";

// Get all flash sales (admin)
export const getFlashSales = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    isActive,
    sort = "startTime",
    order = "desc",
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions
  const filterConditions = {
    ...(search && {
      name: { contains: search, mode: "insensitive" },
    }),
    ...(isActive !== undefined && {
      isActive: isActive === "true",
    }),
  };

  // Get total count
  const totalFlashSales = await prisma.flashSale.count({
    where: filterConditions,
  });

  // Get flash sales
  const flashSales = await prisma.flashSale.findMany({
    where: filterConditions,
    include: {
      products: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: [{ [sort]: order }],
    skip,
    take: parseInt(limit),
  });

  // Format response
  const formattedFlashSales = flashSales.map((sale) => ({
    id: sale.id,
    name: sale.name,
    startTime: sale.startTime,
    endTime: sale.endTime,
    discountPercentage: sale.discountPercentage,
    maxQuantity: sale.maxQuantity,
    soldCount: sale.soldCount,
    isActive: sale.isActive,
    productCount: sale.products.length,
    products: sale.products.map((fp) => ({
      id: fp.id,
      productId: fp.productId,
      product: {
        id: fp.product.id,
        name: fp.product.name,
        slug: fp.product.slug,
        image: fp.product.images[0]
          ? getFileUrl(fp.product.images[0].url)
          : null,
      },
    })),
    ...(sale.createdAt && { createdAt: sale.createdAt }),
    ...(sale.updatedAt && { updatedAt: sale.updatedAt }),
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        flashSales: formattedFlashSales,
        pagination: {
          total: totalFlashSales,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalFlashSales / parseInt(limit)),
        },
      },
      "Flash sales fetched successfully"
    )
  );
});

// Get flash sale by ID (admin)
export const getFlashSaleById = asyncHandler(async (req, res, next) => {
  const { flashSaleId } = req.params;

  const flashSale = await prisma.flashSale.findUnique({
    where: { id: flashSaleId },
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
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!flashSale) {
    throw new ApiError(404, "Flash sale not found");
  }

  // Format response
  const formattedFlashSale = {
    id: flashSale.id,
    name: flashSale.name,
    startTime: flashSale.startTime,
    endTime: flashSale.endTime,
    discountPercentage: flashSale.discountPercentage,
    maxQuantity: flashSale.maxQuantity,
    soldCount: flashSale.soldCount,
    isActive: flashSale.isActive,
    products: flashSale.products.map((fp) => ({
      id: fp.id,
      productId: fp.productId,
      product: {
        id: fp.product.id,
        name: fp.product.name,
        slug: fp.product.slug,
        image: fp.product.images[0]
          ? getFileUrl(fp.product.images[0].url)
          : null,
        price: fp.product.variants[0]?.price || 0,
      },
    })),
    ...(flashSale.createdAt && { createdAt: flashSale.createdAt }),
    ...(flashSale.updatedAt && { updatedAt: flashSale.updatedAt }),
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { flashSale: formattedFlashSale },
        "Flash sale fetched successfully"
      )
    );
});

// Create flash sale (admin)
export const createFlashSale = asyncHandler(async (req, res, next) => {
  const {
    name,
    startTime,
    endTime,
    discountPercentage,
    maxQuantity,
    isActive = true,
    productIds = [],
  } = req.body;

  // Validation
  if (!name || !startTime || !endTime || !discountPercentage) {
    throw new ApiError(
      400,
      "Name, start time, end time, and discount percentage are required"
    );
  }

  // Validate dates
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(400, "Invalid date format");
  }

  if (end <= start) {
    throw new ApiError(400, "End time must be after start time");
  }

  // Validate discount percentage
  if (discountPercentage < 0 || discountPercentage > 100) {
    throw new ApiError(400, "Discount percentage must be between 0 and 100");
  }

  // Validate max quantity if provided
  if (maxQuantity !== undefined && maxQuantity < 0) {
    throw new ApiError(400, "Max quantity must be a positive number");
  }

  // Validate products exist
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      throw new ApiError(400, "One or more products not found");
    }
  }

  // Create flash sale with products in transaction
  const flashSale = await prisma.$transaction(async (tx) => {
    const newFlashSale = await tx.flashSale.create({
      data: {
        name,
        startTime: start,
        endTime: end,
        discountPercentage: parseFloat(discountPercentage),
        maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
        isActive,
        soldCount: 0,
        products: {
          create: productIds.map((productId) => ({
            productId,
          })),
        },
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
              },
            },
          },
        },
      },
    });

    return newFlashSale;
  });

  // Format response
  const formattedFlashSale = {
    id: flashSale.id,
    name: flashSale.name,
    startTime: flashSale.startTime,
    endTime: flashSale.endTime,
    discountPercentage: flashSale.discountPercentage,
    maxQuantity: flashSale.maxQuantity,
    soldCount: flashSale.soldCount,
    isActive: flashSale.isActive,
    products: flashSale.products.map((fp) => ({
      id: fp.id,
      productId: fp.productId,
      product: {
        id: fp.product.id,
        name: fp.product.name,
        slug: fp.product.slug,
        image: fp.product.images[0]
          ? getFileUrl(fp.product.images[0].url)
          : null,
      },
    })),
    ...(flashSale.createdAt && { createdAt: flashSale.createdAt }),
    ...(flashSale.updatedAt && { updatedAt: flashSale.updatedAt }),
  };

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { flashSale: formattedFlashSale },
        "Flash sale created successfully"
      )
    );
});

// Update flash sale (admin)
export const updateFlashSale = asyncHandler(async (req, res, next) => {
  const { flashSaleId } = req.params;
  const {
    name,
    startTime,
    endTime,
    discountPercentage,
    maxQuantity,
    isActive,
    productIds,
  } = req.body;

  // Check if flash sale exists
  const existingFlashSale = await prisma.flashSale.findUnique({
    where: { id: flashSaleId },
  });

  if (!existingFlashSale) {
    throw new ApiError(404, "Flash sale not found");
  }

  // Validate dates if provided
  let start, end;
  if (startTime || endTime) {
    start = startTime ? new Date(startTime) : existingFlashSale.startTime;
    end = endTime ? new Date(endTime) : existingFlashSale.endTime;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, "Invalid date format");
    }

    if (end <= start) {
      throw new ApiError(400, "End time must be after start time");
    }
  }

  // Validate discount percentage if provided
  if (discountPercentage !== undefined) {
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new ApiError(400, "Discount percentage must be between 0 and 100");
    }
  }

  // Validate max quantity if provided
  if (maxQuantity !== undefined && maxQuantity !== null && maxQuantity < 0) {
    throw new ApiError(400, "Max quantity must be a positive number");
  }

  // Update flash sale with products in transaction
  const flashSale = await prisma.$transaction(async (tx) => {
    // Update flash sale
    const updatedFlashSale = await tx.flashSale.update({
      where: { id: flashSaleId },
      data: {
        ...(name && { name }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(discountPercentage !== undefined && {
          discountPercentage: parseFloat(discountPercentage),
        }),
        ...(maxQuantity !== undefined && {
          maxQuantity: maxQuantity ? parseInt(maxQuantity) : null,
        }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Update products if provided
    if (productIds !== undefined && Array.isArray(productIds)) {
      // Delete existing products
      await tx.flashSaleProduct.deleteMany({
        where: { flashSaleId },
      });

      // Validate products exist
      if (productIds.length > 0) {
        const products = await tx.product.findMany({
          where: {
            id: { in: productIds },
          },
        });

        if (products.length !== productIds.length) {
          throw new ApiError(400, "One or more products not found");
        }

        // Create new product associations
        await tx.flashSaleProduct.createMany({
          data: productIds.map((productId) => ({
            flashSaleId,
            productId,
          })),
        });
      }
    }

    // Fetch updated flash sale with products
    return await tx.flashSale.findUnique({
      where: { id: flashSaleId },
      include: {
        products: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });
  });

  // Format response
  const formattedFlashSale = {
    id: flashSale.id,
    name: flashSale.name,
    startTime: flashSale.startTime,
    endTime: flashSale.endTime,
    discountPercentage: flashSale.discountPercentage,
    maxQuantity: flashSale.maxQuantity,
    soldCount: flashSale.soldCount,
    isActive: flashSale.isActive,
    products: flashSale.products.map((fp) => ({
      id: fp.id,
      productId: fp.productId,
      product: {
        id: fp.product.id,
        name: fp.product.name,
        slug: fp.product.slug,
        image: fp.product.images[0]
          ? getFileUrl(fp.product.images[0].url)
          : null,
      },
    })),
    ...(flashSale.createdAt && { createdAt: flashSale.createdAt }),
    ...(flashSale.updatedAt && { updatedAt: flashSale.updatedAt }),
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { flashSale: formattedFlashSale },
        "Flash sale updated successfully"
      )
    );
});

// Delete flash sale (admin)
export const deleteFlashSale = asyncHandler(async (req, res, next) => {
  const { flashSaleId } = req.params;

  // Check if flash sale exists
  const flashSale = await prisma.flashSale.findUnique({
    where: { id: flashSaleId },
  });

  if (!flashSale) {
    throw new ApiError(404, "Flash sale not found");
  }

  // Delete flash sale (products will be deleted due to cascade)
  await prisma.flashSale.delete({
    where: { id: flashSaleId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Flash sale deleted successfully"));
});

// Toggle flash sale active status (admin)
export const toggleFlashSaleStatus = asyncHandler(async (req, res, next) => {
  const { flashSaleId } = req.params;

  // Check if flash sale exists
  const flashSale = await prisma.flashSale.findUnique({
    where: { id: flashSaleId },
  });

  if (!flashSale) {
    throw new ApiError(404, "Flash sale not found");
  }

  // Toggle status
  const updatedFlashSale = await prisma.flashSale.update({
    where: { id: flashSaleId },
    data: {
      isActive: !flashSale.isActive,
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { flashSale: updatedFlashSale },
        `Flash sale ${
          updatedFlashSale.isActive ? "activated" : "deactivated"
        } successfully`
      )
    );
});
