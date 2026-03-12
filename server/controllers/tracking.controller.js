import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendEmail from "../utils/sendEmail.js";

// Get tracking info by order ID (admin & user)
export const getTrackingByOrderId = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  // Check if order exists and belongs to user (if not admin)
  const orderQuery = {
    id: orderId,
  };

  // If not admin, restrict to user's orders
  if (req.user.role !== "ADMIN" && !req.isAdmin) {
    orderQuery.userId = userId;
  }

  const order = await prisma.order.findFirst({
    where: orderQuery,
    include: {
      tracking: {
        include: {
          updates: {
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (!order.tracking) {
    throw new ApiError(404, "Tracking information not found for this order");
  }

  return res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { tracking: order.tracking },
        "Tracking information fetched successfully"
      )
    );
});

// Create tracking for an order (admin only)
export const createTracking = asyncHandler(async (req, res) => {
  const { orderId, trackingNumber, carrier, estimatedDelivery } = req.body;

  if (!orderId || !trackingNumber || !carrier) {
    throw new ApiError(
      400,
      "Order ID, tracking number, and carrier are required"
    );
  }

  // Check if order exists
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      tracking: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Check if tracking already exists
  if (order.tracking) {
    throw new ApiError(
      409,
      "Tracking information already exists for this order"
    );
  }

  // Prepare estimated delivery date
  const deliveryDate = estimatedDelivery ? new Date(estimatedDelivery) : null;

  // Create tracking and initial update in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update order status to shipped
    await tx.order.update({
      where: { id: orderId },
      data: { status: "SHIPPED" },
    });

    // Create tracking record
    const tracking = await tx.tracking.create({
      data: {
        orderId,
        trackingNumber,
        carrier,
        estimatedDelivery: deliveryDate,
        status: "SHIPPED",
        shippedAt: new Date(),
        // Create initial tracking update
        updates: {
          create: {
            status: "SHIPPED",
            location: "Shipping Facility",
            description: "Your order has been shipped and is on its way!",
          },
        },
      },
      include: {
        updates: true,
      },
    });

    return { tracking, order };
  });

  // Send shipping notification email to customer
  try {
    if (order.user && order.user.email) {
      // Send email logic would go here
      console.log(
        `Shipping notification email would be sent to ${order.user.email}`
      );
    }
  } catch (error) {
    console.error("Failed to send shipping notification email:", error);
    // Continue with response even if email fails
  }

  return res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { tracking: result.tracking },
        "Tracking information created successfully"
      )
    );
});

// Update tracking status (admin only)
export const updateTrackingStatus = asyncHandler(async (req, res) => {
  const { trackingId } = req.params;
  const { status, location, description } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  // Check if tracking exists
  const tracking = await prisma.tracking.findUnique({
    where: { id: trackingId },
    include: {
      order: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!tracking) {
    throw new ApiError(404, "Tracking not found");
  }

  // Update tracking status and create update in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Add tracking update
    const update = await tx.trackingUpdate.create({
      data: {
        trackingId,
        status,
        location,
        description,
      },
    });

    // Update main tracking status
    const updatedTracking = await tx.tracking.update({
      where: { id: trackingId },
      data: {
        status,
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
      },
      include: {
        updates: {
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    // If delivered, update order status
    if (status === "DELIVERED") {
      await tx.order.update({
        where: { id: tracking.orderId },
        data: { status: "DELIVERED" },
      });
    }

    return { tracking: updatedTracking, update };
  });

  // Send status update notification email to customer
  try {
    if (tracking.order.user && tracking.order.user.email) {
      // Send email logic would go here
      console.log(
        `Tracking update email would be sent to ${tracking.order.user.email}`
      );
    }
  } catch (error) {
    console.error("Failed to send tracking update email:", error);
    // Continue with response even if email fails
  }

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        tracking: result.tracking,
        update: result.update,
      },
      "Tracking status updated successfully"
    )
  );
});

// Get all trackings with filters (admin only)
export const getAllTrackings = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    carrier,
    orderNumber,
    startDate,
    endDate,
  } = req.query;

  const filters = {
    ...(status && { status }),
    ...(carrier && { carrier }),
    ...(orderNumber && {
      order: {
        orderNumber: {
          contains: orderNumber,
          mode: "insensitive",
        },
      },
    }),
    ...(startDate &&
      endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Get total count
  const totalTrackings = await prisma.tracking.count({
    where: filters,
  });

  // Get trackings with pagination
  const trackings = await prisma.tracking.findMany({
    where: filters,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      updates: {
        take: 1,
        orderBy: {
          timestamp: "desc",
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    skip,
    take,
  });

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        trackings,
        pagination: {
          total: totalTrackings,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalTrackings / parseInt(limit)),
        },
      },
      "Trackings fetched successfully"
    )
  );
});

// Get tracking updates (admin & user)
export const getTrackingUpdates = asyncHandler(async (req, res) => {
  const { trackingId } = req.params;
  const userId = req.user.id;

  // Check if tracking exists and user has access (if not admin)
  const trackingQuery = {
    id: trackingId,
  };

  // If not admin, restrict to user's orders
  if (req.user.role !== "ADMIN" && !req.isAdmin) {
    trackingQuery.order = {
      userId,
    };
  }

  const tracking = await prisma.tracking.findFirst({
    where: trackingQuery,
    include: {
      updates: {
        orderBy: {
          timestamp: "desc",
        },
      },
    },
  });

  if (!tracking) {
    throw new ApiError(404, "Tracking not found or access denied");
  }

  return res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { updates: tracking.updates },
        "Tracking updates fetched successfully"
      )
    );
});

// Check shipping status by tracking number (public)
export const checkShippingStatus = asyncHandler(async (req, res) => {
  const { trackingNumber, carrier } = req.query;

  if (!trackingNumber) {
    throw new ApiError(400, "Tracking number is required");
  }

  // Find tracking by tracking number and optional carrier
  const trackingQuery = {
    trackingNumber,
    ...(carrier && { carrier }),
  };

  const tracking = await prisma.tracking.findFirst({
    where: trackingQuery,
    include: {
      updates: {
        orderBy: {
          timestamp: "desc",
        },
      },
      order: {
        select: {
          orderNumber: true,
          createdAt: true,
        },
      },
    },
  });

  if (!tracking) {
    throw new ApiError(404, "Tracking information not found");
  }

  // Return limited public information
  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        trackingNumber: tracking.trackingNumber,
        carrier: tracking.carrier,
        status: tracking.status,
        estimatedDelivery: tracking.estimatedDelivery,
        shippedAt: tracking.shippedAt,
        deliveredAt: tracking.deliveredAt,
        orderNumber: tracking.order.orderNumber,
        orderDate: tracking.order.createdAt,
        updates: tracking.updates.map((update) => ({
          status: update.status,
          timestamp: update.timestamp,
          location: update.location,
          description: update.description,
        })),
      },
      "Shipping status fetched successfully"
    )
  );
});
