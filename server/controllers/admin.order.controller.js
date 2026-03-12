import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { razorpay } from "../app.js";
import { cancelShiprocketOrder, getShiprocketSettings } from "../utils/shiprocket.js";
import { cancelParcelXOrder, getParcelXSettings } from "../utils/parcelx.js";

// Get all orders with pagination, filtering, and sorting
export const getOrders = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status,
    sort = "createdAt",
    order = "desc",
    startDate,
    endDate,
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions
  const filterConditions = {
    ...(search && {
      OR: [
        { orderNumber: { contains: search, mode: "insensitive" } },
        {
          user: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    }),
    ...(status && { status }),
    ...(startDate &&
      endDate && {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    }),
  };

  // Get total count for pagination
  const totalOrders = await prisma.order.count({
    where: filterConditions,
  });

  // Get orders with pagination
  const orders = await prisma.order.findMany({
    where: filterConditions,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
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
      tracking: {
        select: {
          id: true,
          status: true,
          trackingNumber: true,
          carrier: true,
        },
      },
      razorpayPayment: {
        select: {
          id: true,
          status: true,
          amount: true,
          razorpayPaymentId: true,
        },
      },
      coupon: {
        select: {
          id: true,
          code: true,
          discountType: true,
          discountValue: true,
        },
      },
      shippingAddress: {
        select: {
          id: true,
          name: true,
          street: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          phone: true,
        },
      },
    },
    orderBy: {
      [sort]: order,
    },
    skip,
    take: parseInt(limit),
  });

  // Keep the original order data and preserve historical pricing information
  const formattedOrders = orders.map((order) => ({
    ...order,
    subTotal: parseFloat(order.subTotal),
    tax: parseFloat(order.tax),
    shippingCost: parseFloat(order.shippingCost),
    discount: parseFloat(order.discount) || 0,
    total: parseFloat(order.total), // Use the exact total that was recorded at time of order
    date: order.createdAt, // Add date field for frontend compatibility
    couponDetails: order.coupon
      ? {
        id: order.coupon.id,
        code: order.coupon.code,
        discountType: order.coupon.discountType,
        discountValue: parseFloat(order.coupon.discountValue),
      }
      : order.couponCode
        ? { code: order.couponCode }
        : null,
    // Include shipping data
    shipping: {
      provider: order.shippingProvider || "SHIPROCKET",
      shiprocket: {
        orderId: order.shiprocketOrderId,
        shipmentId: order.shiprocketShipmentId,
        awbCode: order.awbCode,
        courierName: order.courierName,
        status: order.shiprocketStatus,
      },
      parcelx: {
        waybill: order.parcelxWaybill,
        status: order.parcelxStatus,
      },
    },

  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        orders: formattedOrders,
        pagination: {
          total: totalOrders,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalOrders / parseInt(limit)),
        },
      },
      "Orders fetched successfully"
    )
  );
});

// Get order details by ID
export const getOrderById = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: {
            include: {
              images: true,
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
              images: true,
            },
          },
          // Include return requests for each item
          returnRequests: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      tracking: {
        include: {
          updates: {
            orderBy: { timestamp: "desc" },
          },
        },
      },
      razorpayPayment: {
        include: {
          refunds: true,
        },
      },
      shippingAddress: true,
      coupon: {
        select: {
          id: true,
          code: true,
          description: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Function to get proper image URL
  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    const storageUrl = process.env.R2_PUBLIC_URL || "";
    return `${storageUrl}/${image}`;
  };

  // Process order items to include proper image URLs
  const processedItems = order.items.map((item) => {
    let imageUrl = null;

    // Priority 1: Product images (primary first)
    if (item.product.images && item.product.images.length > 0) {
      const primaryImage = item.product.images.find((img) => img.isPrimary);
      imageUrl = primaryImage
        ? getImageUrl(primaryImage.url)
        : getImageUrl(item.product.images[0].url);
    }
    // Priority 2: Variant images as fallback
    else if (item.variant.images && item.variant.images.length > 0) {
      const primaryVariantImage = item.variant.images.find(
        (img) => img.isPrimary
      );
      imageUrl = primaryVariantImage
        ? getImageUrl(primaryVariantImage.url)
        : getImageUrl(item.variant.images[0].url);
    }

    return {
      ...item,
      price: parseFloat(item.price), // Ensure price is a number
      subtotal: parseFloat(item.subtotal), // Ensure subtotal is a number
      imageUrl, // Add computed image URL
      // Include return request information
      returnRequest: item.returnRequests && item.returnRequests.length > 0
        ? {
          id: item.returnRequests[0].id,
          status: item.returnRequests[0].status,
          reason: item.returnRequests[0].reason,
          customReason: item.returnRequests[0].customReason,
          createdAt: item.returnRequests[0].createdAt,
          processedAt: item.returnRequests[0].processedAt,
        }
        : null,
      product: {
        ...item.product,
        // Keep original images array but also add computed image URL
        imageUrl: imageUrl,
      },
    };
  });

  // Normalize values for tax and shipping
  const modifiedOrder = {
    ...order,
    items: processedItems, // Use processed items with image URLs
    subTotal: parseFloat(order.subTotal),
    tax: parseFloat(order.tax),
    shippingCost: parseFloat(order.shippingCost),
    discount: parseFloat(order.discount) || 0,
    total: parseFloat(order.total),
    date: order.createdAt, // Add date field for frontend compatibility
    // Add detailed coupon information
    couponDetails: order.coupon
      ? {
        id: order.coupon.id,
        code: order.coupon.code,
        description: order.coupon.description,
        discountType: order.coupon.discountType,
        discountValue: parseFloat(order.coupon.discountValue),
      }
      : order.couponCode
        ? { code: order.couponCode }
        : null,
    // Include shipping data
    shipping: {
      provider: order.shippingProvider || "SHIPROCKET",
      shiprocket: {
        orderId: order.shiprocketOrderId,
        shipmentId: order.shiprocketShipmentId,
        awbCode: order.awbCode,
        courierName: order.courierName,
        status: order.shiprocketStatus,
      },
      parcelx: {
        waybill: order.parcelxWaybill,
        status: order.parcelxStatus,
      },
    },
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { order: modifiedOrder },
        "Order details fetched successfully"
      )
    );
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { status, notes } = req.body;

  if (!status) {
    throw new ApiError(400, "Status is required");
  }

  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      razorpayPayment: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Validate status transition
  if (!isValidStatusTransition(order.status, status)) {
    throw new ApiError(
      400,
      `Cannot transition from ${order.status} to ${status}`
    );
  }

  // Start a transaction for status-specific actions
  const updatedOrder = await prisma.$transaction(async (tx) => {
    let orderData = {
      status,
      notes: notes
        ? order.notes
          ? `${order.notes}\n${notes}`
          : notes
        : order.notes,
    };

    // If cancelling, record cancellation details
    if (status === "CANCELLED") {
      orderData.cancelReason = notes || "Cancelled by admin";
      orderData.cancelledAt = new Date();
      orderData.cancelledBy = req.admin.id;

      // Return items to inventory
      await handleInventoryReturn(tx, orderId, req.admin.id);

      // Cancel Shiprocket order if it exists
      if (order.shiprocketOrderId) {
        try {
          const settings = await getShiprocketSettings();
          if (settings.isEnabled) {
            await cancelShiprocketOrder(order.shiprocketOrderId);
            orderData.shiprocketStatus = "CANCELLED";
            console.log(`Admin cancelled Shiprocket order ${order.shiprocketOrderId}`);
          }
        } catch (error) {
          console.error("Failed to cancel Shiprocket order:", error.message);
        }
      }

      // Cancel ParcelX order if it exists
      if (order.parcelxWaybill) {
        try {
          const settings = await getParcelXSettings();
          if (settings.isEnabled) {
            await cancelParcelXOrder(order.parcelxWaybill);
            orderData.parcelxStatus = "CANCELLED";
            console.log(`Admin cancelled ParcelX order ${order.parcelxWaybill}`);
          }
        } catch (error) {
          console.error("Failed to cancel ParcelX order:", error.message);
        }
      }
    }

    // If shipping, create or update tracking
    if (status === "SHIPPED") {
      const existingTracking = await tx.tracking.findUnique({
        where: { orderId },
      });

      if (existingTracking) {
        // Update existing tracking
        await tx.tracking.update({
          where: { orderId },
          data: {
            trackingNumber: req.body.trackingNumber || existingTracking.trackingNumber,
            carrier: req.body.carrier || existingTracking.carrier,
            status: "SHIPPED",
            shippedAt: new Date(),
            updates: {
              create: {
                status: "SHIPPED",
                description: "Order has been shipped",
                location: req.body.location || "Warehouse",
              },
            },
          },
        });
      } else {
        // Create new tracking
        await tx.tracking.create({
          data: {
            orderId,
            trackingNumber: req.body.trackingNumber || `SHP${Date.now()}`,
            carrier: req.body.carrier || "Default Carrier",
            status: "SHIPPED",
            shippedAt: new Date(),
            updates: {
              create: {
                status: "SHIPPED",
                description: "Order has been shipped",
                location: req.body.location || "Warehouse",
              },
            },
          },
        });
      }
    }

    // If delivered, update tracking
    if (status === "DELIVERED") {
      if (order.tracking) {
        await tx.tracking.update({
          where: { orderId },
          data: {
            status: "DELIVERED",
            deliveredAt: new Date(),
            updates: {
              create: {
                status: "DELIVERED",
                description: "Order has been delivered",
                location: req.body.location || "Delivery address",
              },
            },
          },
        });
      }
    }

    // Handle payment status updates
    if (
      status === "PAID" &&
      order.razorpayPayment &&
      order.razorpayPayment.status !== "CAPTURED"
    ) {
      await tx.razorpayPayment.update({
        where: { orderId },
        data: {
          status: "CAPTURED",
        },
      });
    }

    // If refunding, initiate Razorpay refund
    if (
      status === "REFUNDED" &&
      order.razorpayPayment &&
      order.razorpayPayment.razorpayPaymentId
    ) {
      const refundData = await initiateRefund(
        order.razorpayPayment.razorpayPaymentId,
        order.total,
        notes
      );

      if (refundData) {
        await tx.razorpayRefund.create({
          data: {
            razorpayPaymentId: order.razorpayPayment.razorpayPaymentId,
            amount: order.total,
            razorpayRefundId: refundData.id,
            status: "PROCESSED",
            reason: notes || "Admin initiated refund",
            notes: JSON.stringify(refundData.notes || {}),
          },
        });

        await tx.razorpayPayment.update({
          where: { orderId },
          data: {
            status: "REFUNDED",
          },
        });
      }
    }

    // Update the order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: orderData,
      include: {
        tracking: true,
        razorpayPayment: true,
      },
    });

    // Create partner commissions when order is delivered (safety check)
    if (status === "DELIVERED" && order.couponId) {
      try {
        // Check if commissions already exist for this order
        const existingCommissions = await tx.partnerEarning.findMany({
          where: { orderId: orderId },
        });

        if (existingCommissions.length === 0) {
          // Calculate final order amount (subtotal - discount)
          const finalOrderAmount =
            parseFloat(order.subTotal) - parseFloat(order.discount);

          // Get coupon partners
          const couponPartners = await tx.couponPartner.findMany({
            where: { couponId: order.couponId },
            include: { partner: true },
          });

          // Create commissions for each partner
          for (const couponPartner of couponPartners) {
            if (
              couponPartner.commission &&
              couponPartner.commission > 0 &&
              finalOrderAmount > 0
            ) {
              // Calculate commission based on FINAL ORDER AMOUNT (not discount)
              const commissionAmount =
                (finalOrderAmount * couponPartner.commission) / 100;

              await tx.partnerEarning.create({
                data: {
                  partnerId: couponPartner.partnerId,
                  orderId: orderId,
                  couponId: order.couponId,
                  amount: commissionAmount.toFixed(2),
                  percentage: couponPartner.commission,
                  createdAt: new Date(),
                },
              });

              console.log(
                `Created delayed commission for partner ${couponPartner.partner.name
                }: ₹${commissionAmount.toFixed(2)} (${couponPartner.commission
                }% of final order ₹${finalOrderAmount.toFixed(2)})`
              );
            }
          }
        }
      } catch (commissionError) {
        console.error(
          "Error creating partner commissions on delivery:",
          commissionError
        );
      }
    }

    return updatedOrder;
  });

  // Log the activity
  await prisma.activityLog.create({
    data: {
      entityType: "order",
      entityId: orderId,
      action: "update",
      description: `Order status updated from ${order.status} to ${status}`,
      performedBy: req.admin.id,
      performedByRole: "admin",
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { order: updatedOrder },
        "Order status updated successfully"
      )
    );
});

// Update tracking information
export const updateTracking = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const {
    trackingNumber,
    carrier,
    status,
    location,
    description,
    estimatedDelivery,
  } = req.body;

  // Find the order and its tracking
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { tracking: true },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  let tracking;

  // If tracking exists, update it
  if (order.tracking) {
    tracking = await prisma.tracking.update({
      where: { orderId },
      data: {
        ...(trackingNumber && { trackingNumber }),
        ...(carrier && { carrier }),
        ...(status && { status }),
        ...(estimatedDelivery && {
          estimatedDelivery: new Date(estimatedDelivery),
        }),
      },
    });

    // Add tracking update
    if (status) {
      await prisma.trackingUpdate.create({
        data: {
          trackingId: tracking.id,
          status,
          location,
          description: description || getDefaultTrackingDescription(status),
        },
      });
    }
  }
  // If tracking doesn't exist, create it
  else {
    tracking = await prisma.tracking.create({
      data: {
        orderId,
        trackingNumber: trackingNumber || `TRK${Date.now()}`,
        carrier: carrier || "Default Carrier",
        status: status || "PROCESSING",
        ...(estimatedDelivery && {
          estimatedDelivery: new Date(estimatedDelivery),
        }),
        updates: {
          create: {
            status: status || "PROCESSING",
            location,
            description:
              description ||
              getDefaultTrackingDescription(status || "PROCESSING"),
          },
        },
      },
    });
  }

  // Update order status if needed
  if (status && order.status !== "SHIPPED" && status === "SHIPPED") {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
      },
    });
  } else if (status && order.status !== "DELIVERED" && status === "DELIVERED") {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "DELIVERED",
      },
    });
  }

  const updatedTracking = await prisma.tracking.findUnique({
    where: { orderId },
    include: {
      updates: {
        orderBy: { timestamp: "desc" },
      },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { tracking: updatedTracking },
        "Tracking information updated successfully"
      )
    );
});

// Create manual order
export const createOrder = asyncHandler(async (req, res, next) => {
  const {
    userId,
    items,
    shippingAddressId,
    shippingCost,
    taxRate,
    discount,
    couponCode,
    couponId,
    notes,
  } = req.body;

  if (!userId || !items || items.length === 0) {
    throw new ApiError(400, "User ID and at least one item are required");
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Validate shipping address if provided
  if (shippingAddressId) {
    const address = await prisma.address.findFirst({
      where: {
        id: shippingAddressId,
        userId,
      },
    });

    if (!address) {
      throw new ApiError(404, "Shipping address not found for this user");
    }
  }

  // If couponCode is provided but not couponId, try to find the coupon
  let finalCouponId = couponId;
  if (couponCode && !couponId) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });
    if (coupon) {
      finalCouponId = coupon.id;
    }
  }

  // Generate unique order number
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Calculate order totals
  let subTotal = 0;
  const orderItems = [];

  // Validate items and calculate totals
  for (const item of items) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: {
        product: true,
      },
    });

    if (!variant) {
      throw new ApiError(404, `Product variant not found: ${item.variantId}`);
    }

    if (variant.quantity < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${variant.product.name}`);
    }

    // Get base price (sale price if exists, otherwise regular price)
    const basePrice = variant.salePrice || variant.price;
    let finalPrice = parseFloat(basePrice);
    let flashSaleInfo = null;

    // Check for active flash sale for this product
    const now = new Date();
    const flashSaleProduct = await prisma.flashSaleProduct.findFirst({
      where: {
        productId: variant.productId,
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
          },
        },
      },
    });

    // Apply flash sale discount if applicable
    if (flashSaleProduct) {
      const discountAmount = (finalPrice * flashSaleProduct.flashSale.discountPercentage) / 100;
      const priceBeforeFlashSale = finalPrice;
      finalPrice = Math.round((finalPrice - discountAmount) * 100) / 100;
      flashSaleInfo = {
        flashSaleId: flashSaleProduct.flashSale.id,
        flashSaleName: flashSaleProduct.flashSale.name,
        flashSaleDiscount: flashSaleProduct.flashSale.discountPercentage,
        originalPrice: priceBeforeFlashSale,
      };
    }

    const itemTotal = finalPrice * item.quantity;
    subTotal += itemTotal;

    orderItems.push({
      productId: variant.productId,
      variantId: variant.id,
      price: finalPrice,
      quantity: item.quantity,
      subtotal: itemTotal,
      ...(flashSaleInfo || {}),
    });
  }

  // Calculate tax and total
  const taxAmount = 0; // Set tax to 0
  const shippingAmount = 0; // Set shipping to 0
  const discountAmount = parseFloat(discount) || 0;
  const total = subTotal - discountAmount; // Calculate total without tax and shipping

  // Create order with transaction to handle inventory
  const order = await prisma.$transaction(async (tx) => {
    // Fetch coupon with partner info if coupon is used
    let coupon = null;
    if (finalCouponId) {
      coupon = await tx.coupon.findUnique({
        where: { id: finalCouponId },
        include: { partner: true },
      });
    }

    // Create the order
    const newOrder = await tx.order.create({
      data: {
        orderNumber,
        userId,
        status: "PENDING",
        subTotal,
        tax: taxAmount,
        shippingCost: shippingAmount,
        discount: discountAmount,
        couponCode,
        couponId: finalCouponId,
        total,
        shippingAddressId,
        notes,
        billingAddressSameAsShipping: true,
        items: {
          create: orderItems,
        },
      },
    });

    // If coupon has a partner, create PartnerEarning
    if (coupon && coupon.partnerId && coupon.partnerCommission) {
      // Calculate earning amount (commission % of subTotal - discount)
      const commissionBase = subTotal - (discountAmount || 0);
      const earningAmount = (commissionBase * coupon.partnerCommission) / 100;
      await tx.partnerEarning.create({
        data: {
          partnerId: coupon.partnerId,
          orderId: newOrder.id,
          couponId: coupon.id,
          amount: earningAmount,
          percentage: coupon.partnerCommission,
        },
      });
    }

    // Update Flash Sale Sold Count
    for (const orderItem of orderItems) {
      if (orderItem.flashSaleId) {
        await tx.flashSale.update({
          where: { id: orderItem.flashSaleId },
          data: { soldCount: { increment: orderItem.quantity } },
        });
      }
    }

    // Update inventory for each variant
    for (const item of items) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });

      // Log inventory change
      await tx.inventoryLog.create({
        data: {
          variantId: item.variantId,
          quantityChange: -item.quantity,
          reason: "sale",
          referenceId: newOrder.id,
          previousQuantity: await tx.productVariant
            .findUnique({
              where: { id: item.variantId },
              select: { quantity: true },
            })
            .then((v) => v.quantity + item.quantity),
          newQuantity: await tx.productVariant
            .findUnique({
              where: { id: item.variantId },
              select: { quantity: true },
            })
            .then((v) => v.quantity),
          notes: `Manual order ${orderNumber}`,
          createdBy: req.admin.id,
        },
      });
    }

    return newOrder;
  });

  // Log the activity
  await prisma.activityLog.create({
    data: {
      entityType: "order",
      entityId: order.id,
      action: "create",
      description: `Manual order created: ${orderNumber}`,
      performedBy: req.admin.id,
      performedByRole: "admin",
    },
  });

  const completeOrder = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: {
        include: {
          product: true,
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
        },
      },
      shippingAddress: true,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { order: completeOrder },
        "Order created successfully"
      )
    );
});

// Process payment manually
export const processPayment = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { paymentMethod, notes } = req.body;

  // Find the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      razorpayPayment: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (
    order.status === "PAID" ||
    order.status === "SHIPPED" ||
    order.status === "DELIVERED"
  ) {
    throw new ApiError(400, "Order is already paid or processed");
  }

  // Process the payment
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Create Razorpay payment record if it doesn't exist
    if (!order.razorpayPayment) {
      await tx.razorpayPayment.create({
        data: {
          orderId,
          amount: order.total,
          currency: "INR",
          razorpayOrderId: `MANUAL-${Date.now()}`,
          razorpayPaymentId: `MANUAL-PAYMENT-${Date.now()}`,
          status: "CAPTURED",
          paymentMethod: paymentMethod || "OTHER",
          notes: notes ? JSON.stringify({ notes }) : null,
        },
      });
    } else {
      // Update existing payment record
      await tx.razorpayPayment.update({
        where: { orderId },
        data: {
          status: "CAPTURED",
          paymentMethod: paymentMethod || "OTHER",
          notes: notes ? JSON.stringify({ notes }) : null,
        },
      });
    }

    // Update order status
    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "PAID",
        notes: notes
          ? order.notes
            ? `${order.notes}\n${notes}`
            : notes
          : order.notes,
      },
    });
  });

  // Log the activity
  await prisma.activityLog.create({
    data: {
      entityType: "order",
      entityId: orderId,
      action: "payment",
      description: `Manual payment processed for order ${order.orderNumber}`,
      performedBy: req.admin.id,
      performedByRole: "admin",
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { order: updatedOrder },
        "Payment processed successfully"
      )
    );
});

// Get order statistics
export const getOrderStats = asyncHandler(async (req, res, next) => {
  const { period = "week" } = req.query;

  // Determine date range based on period
  const endDate = new Date();
  let startDate = new Date();

  switch (period) {
    case "day":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "week":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  // Get order counts by status
  const orderStatuses = await prisma.order.groupBy({
    by: ["status"],
    _count: true,
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Convert to a more readable format
  const statusCounts = {};
  orderStatuses.forEach((status) => {
    statusCounts[status.status] = status._count;
  });

  // Get total sales amount
  const totalSales = await prisma.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["PAID", "SHIPPED", "DELIVERED"],
      },
    },
  });

  // Get total number of orders
  const totalOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Get average order value
  const averageOrderValue =
    totalSales._sum.total && totalOrders
      ? totalSales._sum.total / totalOrders
      : 0;

  // Get monthly sales data for the last 6 months
  const monthlyRevenueStartDate = new Date();
  monthlyRevenueStartDate.setMonth(monthlyRevenueStartDate.getMonth() - 5);
  monthlyRevenueStartDate.setDate(1);
  monthlyRevenueStartDate.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: monthlyRevenueStartDate,
      },
      status: {
        in: ["PAID", "SHIPPED", "DELIVERED"],
      },
    },
    select: {
      total: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Group orders by month
  const monthlyData = {};
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = 0;
    }

    monthlyData[monthYear] += parseFloat(order.total);
  });

  // Convert to array format needed for the chart
  const monthlySales = Object.entries(monthlyData).map(([month, revenue]) => ({
    month,
    revenue: parseFloat(revenue).toFixed(2),
  }));

  // Calculate growth percentages
  // For orders: Compare current period vs previous same-length period
  const previousPeriodStartDate = new Date(startDate);
  const periodLength = endDate.getTime() - startDate.getTime();
  previousPeriodStartDate.setTime(
    previousPeriodStartDate.getTime() - periodLength
  );

  const previousPeriodOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: previousPeriodStartDate,
        lt: startDate,
      },
    },
  });

  const previousPeriodSales = await prisma.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      createdAt: {
        gte: previousPeriodStartDate,
        lt: startDate,
      },
      status: {
        in: ["PAID", "SHIPPED", "DELIVERED"],
      },
    },
  });

  // Calculate growth percentages
  let orderGrowth = 0;
  if (previousPeriodOrders > 0) {
    orderGrowth = Math.round(
      ((totalOrders - previousPeriodOrders) / previousPeriodOrders) * 100
    );
  }

  let revenueGrowth = 0;
  if (previousPeriodSales._sum.total) {
    revenueGrowth = Math.round(
      ((totalSales._sum.total - previousPeriodSales._sum.total) /
        previousPeriodSales._sum.total) *
      100
    );
  }

  // Get top selling products
  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
      subtotal: true,
    },
    where: {
      order: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ["PAID", "SHIPPED", "DELIVERED"],
        },
      },
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 5,
  });

  // Get product details for the top products
  const topProductsDetails = await Promise.all(
    topProducts.map(async (product) => {
      const details = await prisma.product.findUnique({
        where: { id: product.productId },
        select: {
          id: true,
          name: true,
          slug: true,
          images: {
            where: { isPrimary: true },
            take: 1,
          },
        },
      });

      return {
        ...details,
        quantitySold: product._sum.quantity,
        revenue: product._sum.subtotal,
      };
    })
  );

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        period,
        timeRange: {
          start: startDate,
          end: endDate,
        },
        totalOrders,
        totalSales: totalSales._sum.total || 0,
        averageOrderValue,
        statusCounts,
        topProducts: topProductsDetails,
        monthlySales,
        orderGrowth,
        revenueGrowth,
      },
      "Order statistics fetched successfully"
    )
  );
});

// Helper function to check if a status transition is valid
function isValidStatusTransition(currentStatus, newStatus) {
  // Define allowed transitions
  const allowedTransitions = {
    PENDING: ["PROCESSING", "PAID", "CANCELLED"],
    PROCESSING: ["PAID", "CANCELLED", "SHIPPED"],
    PAID: ["PROCESSING", "SHIPPED", "CANCELLED", "REFUNDED"],
    SHIPPED: ["DELIVERED", "CANCELLED", "PROCESSING"],
    DELIVERED: ["REFUNDED"],
    CANCELLED: ["REFUNDED"],
    REFUNDED: [],
  };

  // Check if the transition is allowed
  return allowedTransitions[currentStatus]?.includes(newStatus) ?? false;
}

// Helper function to handle inventory return for cancelled orders
async function handleInventoryReturn(tx, orderId, adminId) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: {
      variant: true,
    },
  });

  for (const item of items) {
    const currentQuantity = await tx.productVariant
      .findUnique({
        where: { id: item.variantId },
        select: { quantity: true },
      })
      .then((v) => v.quantity);

    // Update variant quantity
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: {
        quantity: {
          increment: item.quantity,
        },
      },
    });

    // Log inventory change
    await tx.inventoryLog.create({
      data: {
        variantId: item.variantId,
        quantityChange: item.quantity,
        reason: "return",
        referenceId: orderId,
        previousQuantity: currentQuantity,
        newQuantity: currentQuantity + item.quantity,
        notes: "Order cancelled - returned to inventory",
        createdBy: adminId,
      },
    });
  }
}

// Helper function to initiate Razorpay refund
async function initiateRefund(paymentId, amount, notes) {
  try {
    // Check if Razorpay is initialized
    if (!razorpay) {
      console.error("Razorpay not initialized");
      return null;
    }

    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount * 100, // Convert to paisa
      notes: { reason: notes || "Admin initiated refund" },
    });

    return refund;
  } catch (error) {
    console.error("Razorpay refund error:", error);
    return null;
  }
}

// Helper function to get default tracking description based on status
function getDefaultTrackingDescription(status) {
  const descriptions = {
    PROCESSING: "Order is being processed",
    SHIPPED: "Order has been shipped",
    IN_TRANSIT: "Order is in transit",
    OUT_FOR_DELIVERY: "Order is out for delivery",
    DELIVERED: "Order has been delivered",
    FAILED: "Delivery attempt failed",
    RETURNED: "Order has been returned",
  };

  return descriptions[status] || "Status updated";
}

// Cleanup partner earnings for non-delivered orders (Admin only)
export const cleanupInvalidPartnerEarnings = asyncHandler(async (req, res) => {
  try {
    // Find all partner earnings where the associated order is not DELIVERED
    const invalidEarnings = await prisma.partnerEarning.findMany({
      where: {
        order: {
          status: {
            not: "DELIVERED",
          },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
        partner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (invalidEarnings.length === 0) {
      return res.status(200).json(
        new ApiResponsive(
          200,
          {
            message: "No invalid partner earnings found",
            cleanedCount: 0,
          },
          "Cleanup completed"
        )
      );
    }

    // Delete invalid earnings
    const deletedEarnings = await prisma.partnerEarning.deleteMany({
      where: {
        order: {
          status: {
            not: "DELIVERED",
          },
        },
      },
    });

    console.log(`Cleaned up ${deletedEarnings.count} invalid partner earnings`);

    res.status(200).json(
      new ApiResponsive(
        200,
        {
          cleanedCount: deletedEarnings.count,
          invalidEarnings: invalidEarnings.map((earning) => ({
            earningId: earning.id,
            orderNumber: earning.order.orderNumber,
            orderStatus: earning.order.status,
            partnerName: earning.partner.name,
            amount: earning.amount,
          })),
        },
        "Invalid partner earnings cleaned up successfully"
      )
    );
  } catch (error) {
    console.error("Error during cleanup:", error);
    res.status(500).json(new ApiResponsive(500, null, "Error during cleanup"));
  }
});

export const deleteOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Use transaction to ensure data integrity
  await prisma.$transaction(async (tx) => {
    // 1. Handle PhonePeTransaction (if any)
    // We nullify the orderId to preserve the transaction record but break the link
    await tx.phonePeTransaction.updateMany({
      where: { orderId: orderId },
      data: { orderId: null },
    });

    // 2. Handle Referral (if any)
    // We nullify the orderId to preserve the referral record but break the link
    await tx.referral.updateMany({
      where: { orderId: orderId },
      data: { orderId: null },
    });

    // 3. Delete the Order record
    // This will trigger cascade deletion for:
    // OrderItem, RazorpayPayment, Tracking, PartnerEarning, ReturnRequest
    await tx.order.delete({
      where: { id: orderId },
    });
  });

  console.log(`Order ${orderId} deleted by admin`);

  res.status(200).json(
    new ApiResponsive(
      200,
      null,
      "Order deleted successfully"
    )
  );
});
