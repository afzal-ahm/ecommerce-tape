import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { getShiprocketSettings, processShiprocketReturn } from "../utils/shiprocket.js";
import { getParcelXSettings, processOrderForParcelX } from "../utils/parcelx.js";

// Get return settings
export const getReturnSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.returnSettings.findFirst();
  if (!settings) {
    settings = await prisma.returnSettings.create({
      data: { isEnabled: true, returnWindowDays: 7 },
    });
  }
  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { settings },
        "Return settings fetched successfully"
      )
    );
});

// Update return settings
export const updateReturnSettings = asyncHandler(async (req, res) => {
  const { isEnabled, returnWindowDays } = req.body;
  const adminId = req.admin.id;

  if (
    returnWindowDays !== undefined &&
    (returnWindowDays < 1 || returnWindowDays > 30)
  ) {
    throw new ApiError(400, "Return window must be between 1 and 30 days");
  }

  let settings = await prisma.returnSettings.findFirst();
  if (!settings) {
    settings = await prisma.returnSettings.create({
      data: {
        isEnabled: isEnabled !== undefined ? isEnabled : true,
        returnWindowDays: returnWindowDays || 7,
        updatedBy: adminId,
      },
    });
  } else {
    settings = await prisma.returnSettings.update({
      where: { id: settings.id },
      data: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(returnWindowDays !== undefined && { returnWindowDays }),
        updatedBy: adminId,
      },
    });
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { settings },
        "Return settings updated successfully"
      )
    );
});

// Get all return requests
export const getAllReturnRequests = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    status,
    orderId,
    userId,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filterConditions = {
    ...(status && { status: status.toUpperCase() }),
    ...(orderId && { orderId }),
    ...(userId && { userId }),
    ...(search && {
      OR: [
        { order: { orderNumber: { contains: search, mode: "insensitive" } } },
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          orderItem: {
            product: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
      ],
    }),
  };

  const [returnRequests, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where: filterConditions,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
        orderItem: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
            variant: {
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
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { [sort]: order },
      skip,
      take: parseInt(limit),
    }),
    prisma.returnRequest.count({ where: filterConditions }),
  ]);

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        returnRequests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Return requests fetched successfully"
    )
  );
});

// Get return request by ID (admin)
export const getReturnRequestById = asyncHandler(async (req, res) => {
  const { returnId } = req.params;

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
    include: {
      order: {
        include: {
          shippingAddress: true,
          items: {
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
      },
      orderItem: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          variant: {
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
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!returnRequest) {
    throw new ApiError(404, "Return request not found");
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { returnRequest },
        "Return request fetched successfully"
      )
    );
});

// Update return request status
export const updateReturnRequestStatus = asyncHandler(async (req, res) => {
  const { returnId } = req.params;
  const { status, adminNotes } = req.body;
  const adminId = req.admin.id;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  const validStatuses = [
    "PENDING",
    "APPROVED",
    "REJECTED",
    "PROCESSING",
    "COMPLETED",
  ];
  if (!validStatuses.includes(status.toUpperCase())) {
    throw new ApiError(
      400,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnId },
  });

  if (!returnRequest) {
    throw new ApiError(404, "Return request not found");
  }

  const updateData = {
    status: status.toUpperCase(),
    processedBy: adminId,
    processedAt: new Date(),
    ...(adminNotes && { adminNotes }),
  };

  // If approved, update inventory and handle Shiprocket
  if (status.toUpperCase() === "APPROVED") {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: returnRequest.orderItemId },
      include: { variant: true },
    });

    if (orderItem) {
      await prisma.productVariant.update({
        where: { id: orderItem.variantId },
        data: {
          quantity: {
            increment: orderItem.quantity,
          },
        },
      });

      // Log inventory change
      await prisma.inventoryLog.create({
        data: {
          variantId: orderItem.variantId,
          quantityChange: orderItem.quantity,
          reason: "return",
          referenceId: returnId,
          previousQuantity: orderItem.variant.quantity,
          newQuantity: orderItem.variant.quantity + orderItem.quantity,
          createdBy: adminId,
        },
      });
    }

    // Check if Shiprocket is enabled and order has Shiprocket info - process return
    try {
      const shiprocketSettings = await getShiprocketSettings();

      // Update order status to indicate return
      await prisma.order.update({
        where: { id: returnRequest.orderId },
        data: {
          status: "RETURN_APPROVED",
        },
      });

      // Process Shiprocket return if enabled
      if (shiprocketSettings.isEnabled) {
        // This will create return order in Shiprocket and update shiprocketStatus
        processShiprocketReturn(returnRequest.orderId, returnRequest.reason).catch((err) => {
          console.error("Shiprocket return processing error:", err.message);
        });
      }

      // Check ParcelX for return processing (using manifestation if reverse supported, otherwise just status update)
      const parcelxSettings = await getParcelXSettings();
      if (parcelxSettings.isEnabled) {
        // ParcelX specific return logic would go here
        // For now, we've updated the order status already
        console.log("ParcelX enabled for return - manual reverse pickup might be required");
      }
    } catch (err) {
      console.log("Return processing error:", err.message);
    }
  }

  const updatedReturn = await prisma.returnRequest.update({
    where: { id: returnId },
    data: updateData,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
        },
      },
      orderItem: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { returnRequest: updatedReturn },
        "Return request updated successfully"
      )
    );
});

// Get return statistics
export const getReturnStats = asyncHandler(async (req, res) => {
  const [totalReturns, statusCounts, recentReturns] = await Promise.all([
    prisma.returnRequest.count(),
    prisma.returnRequest.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.returnRequest.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const stats = {
    totalReturns,
    statusBreakdown: statusCounts.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {}),
    recentReturns,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { stats },
        "Return statistics fetched successfully"
      )
    );
});
