import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";

// Get return settings (public)
export const getReturnSettings = asyncHandler(async (req, res) => {
  let settings = await prisma.returnSettings.findFirst();
  if (!settings) {
    settings = await prisma.returnSettings.create({
      data: { isEnabled: true, returnWindowDays: 7 },
    });
  }
  res.status(200).json(
    new ApiResponsive(200, { settings }, "Return settings fetched successfully")
  );
});

// Get return reasons (predefined options)
export const getReturnReasons = asyncHandler(async (req, res) => {
  const reasons = [
    "Defective/Damaged Product",
    "Wrong Item Received",
    "Size/Color Mismatch",
    "Quality Issues",
    "Not as Described",
    "Changed My Mind",
    "Other",
  ];
  res.status(200).json(
    new ApiResponsive(200, { reasons }, "Return reasons fetched successfully")
  );
});

// Create return request
export const createReturnRequest = asyncHandler(async (req, res) => {
  const { orderId, orderItemId, reason, customReason, images } = req.body;
  const userId = req.user.id;

  if (!orderId || !orderItemId || !reason) {
    throw new ApiError(400, "Order ID, Order Item ID, and reason are required");
  }

  // Check if return feature is enabled
  const returnSettings = await prisma.returnSettings.findFirst();
  if (!returnSettings || !returnSettings.isEnabled) {
    throw new ApiError(403, "Return requests are currently disabled");
  }

  // Verify order belongs to user and is delivered
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
      status: "DELIVERED",
    },
    include: {
      items: {
        where: { id: orderItemId },
      },
      tracking: {
        include: {
          updates: {
            orderBy: { timestamp: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found or not eligible for return");
  }

  if (order.items.length === 0) {
    throw new ApiError(404, "Order item not found");
  }

  // Check if order was delivered within return window
  const deliveryDate =
    order.tracking?.updates?.[0]?.timestamp ||
    order.tracking?.deliveredAt ||
    order.updatedAt;
  const daysSinceDelivery = Math.floor(
    (new Date() - new Date(deliveryDate)) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceDelivery > returnSettings.returnWindowDays) {
    throw new ApiError(
      400,
      `Return request must be submitted within ${returnSettings.returnWindowDays} days of delivery. This order was delivered ${daysSinceDelivery} days ago.`
    );
  }

  // Check if return request already exists for this order item
  const existingReturn = await prisma.returnRequest.findFirst({
    where: {
      orderItemId,
      status: {
        in: ["PENDING", "APPROVED", "PROCESSING"],
      },
    },
  });

  if (existingReturn) {
    throw new ApiError(400, "A return request already exists for this item");
  }

  // Validate reason
  const validReasons = [
    "Defective/Damaged Product",
    "Wrong Item Received",
    "Size/Color Mismatch",
    "Quality Issues",
    "Not as Described",
    "Changed My Mind",
    "Other",
  ];

  if (!validReasons.includes(reason)) {
    throw new ApiError(400, "Invalid return reason");
  }

  if (reason === "Other" && !customReason) {
    throw new ApiError(400, "Custom reason is required when selecting 'Other'");
  }

  // Create return request
  const returnRequest = await prisma.returnRequest.create({
    data: {
      orderId,
      orderItemId,
      userId,
      reason,
      customReason: reason === "Other" ? customReason : null,
      images: images || [],
      status: "PENDING",
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      },
      orderItem: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
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
    },
  });

  res.status(201).json(
    new ApiResponsive(
      201,
      { returnRequest },
      "Return request created successfully"
    )
  );
});

// Get my return requests
export const getMyReturnRequests = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const whereClause = {
    userId,
    ...(status && { status: status.toUpperCase() }),
  };

  const [returnRequests, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where: whereClause,
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
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    }),
    prisma.returnRequest.count({ where: whereClause }),
  ]);

  // Format return requests with dynamic attributes
  const formattedReturnRequests = returnRequests.map((returnReq) => ({
    ...returnReq,
    orderItem: returnReq.orderItem
      ? {
          ...returnReq.orderItem,
          variant: returnReq.orderItem.variant
            ? {
                ...returnReq.orderItem.variant,
                // Extract all attributes dynamically
                attributes: (() => {
                  if (!returnReq.orderItem.variant.attributes) return {};
                  const attributesMap = {};
                  returnReq.orderItem.variant.attributes.forEach((vav) => {
                    const attrName = vav.attributeValue?.attribute?.name;
                    const attrValue = vav.attributeValue?.value;
                    const hexCode = vav.attributeValue?.hexCode;
                    if (attrName && attrValue) {
                      attributesMap[attrName] = {
                        value: attrValue,
                        hexCode: hexCode || null,
                      };
                    }
                  });
                  return attributesMap;
                })(),
              }
            : null,
        }
      : null,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        returnRequests: formattedReturnRequests,
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

// Get return request by ID
export const getReturnRequestById = asyncHandler(async (req, res) => {
  const { returnId } = req.params;
  const userId = req.user.id;

  const returnRequest = await prisma.returnRequest.findFirst({
    where: {
      id: returnId,
      userId,
    },
    include: {
      order: {
        include: {
          shippingAddress: true,
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
    },
  });

  if (!returnRequest) {
    throw new ApiError(404, "Return request not found");
  }

  // Format return request with dynamic attributes
  const formattedReturnRequest = {
    ...returnRequest,
    orderItem: returnRequest.orderItem
      ? {
          ...returnRequest.orderItem,
          variant: returnRequest.orderItem.variant
            ? {
                ...returnRequest.orderItem.variant,
                // Extract all attributes dynamically
                attributes: (() => {
                  if (!returnRequest.orderItem.variant.attributes) return {};
                  const attributesMap = {};
                  returnRequest.orderItem.variant.attributes.forEach((vav) => {
                    const attrName = vav.attributeValue?.attribute?.name;
                    const attrValue = vav.attributeValue?.value;
                    const hexCode = vav.attributeValue?.hexCode;
                    if (attrName && attrValue) {
                      attributesMap[attrName] = {
                        value: attrValue,
                        hexCode: hexCode || null,
                      };
                    }
                  });
                  return attributesMap;
                })(),
              }
            : null,
        }
      : null,
  };

  res.status(200).json(
    new ApiResponsive(
      200,
      { returnRequest: formattedReturnRequest },
      "Return request fetched successfully"
    )
  );
});

