import crypto from "crypto";
import Razorpay from "razorpay";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import sendEmail from "../utils/sendEmail.js";
import { getOrderConfirmationTemplate } from "../email/temp/EmailTemplate.js";
import { getFileUrl } from "../utils/deleteFromS3.js";
import { processReferralReward } from "./referral.controller.js";
import { decrypt } from "../utils/encryption.js";
import { processOrderForShipping } from "../utils/shiprocket.js";
import { processOrderForParcelX, getParcelXSettings } from "../utils/parcelx.js";


async function getPaymentGatewayConfig(userId = null, gateway = "RAZORPAY") {

  let paymentSettings;

  if (userId) {

    paymentSettings = await prisma.paymentGatewaySetting.findUnique({
      where: {
        userId_gateway: {
          userId,
          gateway: gateway.toUpperCase(),
        },
      },
    });
  }

  if (!paymentSettings) {
    paymentSettings = await prisma.paymentGatewaySetting.findFirst({
      where: {
        gateway: gateway.toUpperCase(),
        isActive: true,
      },
    });
  }

  if (!paymentSettings || !paymentSettings.isActive) {
    throw new ApiError(
      400,
      `Payment gateway ${gateway} is not configured or not active. Please configure payment gateway keys in admin settings.`
    );
  }

  if (gateway.toUpperCase() === "RAZORPAY") {
    if (!paymentSettings.razorpayKeyId || !paymentSettings.razorpayKeySecret) {
      throw new ApiError(400, "Razorpay keys are not configured. Please configure Razorpay Key ID and Key Secret in Payment Gateway Settings.");
    }

    let decryptedSecret;
    try {
      decryptedSecret = decrypt(paymentSettings.razorpayKeySecret);
      if (!decryptedSecret || decryptedSecret.trim() === "") {
        throw new Error("Decrypted secret is empty");
      }
    } catch (decryptError) {
      console.error("Error decrypting Razorpay key secret:", decryptError);
      throw new ApiError(400, "Failed to decrypt Razorpay key secret. Please reconfigure your Razorpay keys.");
    }

    let razorpayInstance;
    try {
      razorpayInstance = new Razorpay({
        key_id: paymentSettings.razorpayKeyId,
        key_secret: decryptedSecret,
      });
    } catch (razorpayError) {
      console.error("Error initializing Razorpay:", razorpayError);
      throw new ApiError(400, `Failed to initialize Razorpay: ${razorpayError.message || "Invalid keys"}`);
    }

    return {
      razorpayInstance,
      paymentSettings: {
        gateway: paymentSettings.gateway,
        mode: paymentSettings.mode,
        userId: paymentSettings.userId,
        razorpayKeyId: paymentSettings.razorpayKeyId,
        razorpayKeySecret: decryptedSecret,
      },
    };
  }

  // For PhonePe, return settings without Razorpay instance
  return {
    razorpayInstance: null,
    paymentSettings: {
      gateway: paymentSettings.gateway,
      mode: paymentSettings.mode,
      userId: paymentSettings.userId,
      phonepeMerchantId: paymentSettings.phonepeMerchantId,
      phonepeSaltKey: paymentSettings.phonepeSaltKey
        ? decrypt(paymentSettings.phonepeSaltKey)
        : null,
      phonepeSaltIndex: paymentSettings.phonepeSaltIndex,
    },
  };
}

// Get payment settings (public endpoint for checkout page)
export const getPaymentSettings = asyncHandler(async (req, res) => {
  // Get or create payment settings (singleton)
  let paymentSettings = await prisma.paymentSettings.findFirst();

  // If no settings exist, create default ones
  if (!paymentSettings) {
    paymentSettings = await prisma.paymentSettings.create({
      data: {
        cashEnabled: true,
        razorpayEnabled: false,
        codCharge: 0,
      },
    });
  }

  // Check if payment gateway keys are configured
  // For now, we'll check for any active payment gateway settings
  // In a multi-merchant system, we might need to check for the order owner's keys
  // For now, checking if any admin has configured keys

  // Check Razorpay keys
  const razorpaySettings = await prisma.paymentGatewaySetting.findFirst({
    where: {
      gateway: "RAZORPAY",
      isActive: true,
      razorpayKeyId: { not: null },
      razorpayKeySecret: { not: null },
    },
  });

  // Check PhonePe keys
  const phonepeSettings = await prisma.paymentGatewaySetting.findFirst({
    where: {
      gateway: "PHONEPE",
      isActive: true,
      phonepeMerchantId: { not: null },
      phonepeSaltKey: { not: null },
      phonepeSaltIndex: { not: null },
    },
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        cashEnabled: paymentSettings.cashEnabled,
        razorpayEnabled: paymentSettings.razorpayEnabled && !!razorpaySettings,
        phonepeEnabled: !!phonepeSettings,
        codCharge: parseFloat(paymentSettings.codCharge) || 0,
      },
      "Payment settings fetched successfully"
    )
  );
});

// Get Razorpay Key (from DB for the user)
export const getRazorpayKey = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.body.userId;

  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }

  const paymentConfig = await getPaymentGatewayConfig(userId, "RAZORPAY");

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { key: paymentConfig.paymentSettings.razorpayKeyId || null },
        "Razorpay key fetched successfully"
      )
    );
});

// Create Razorpay order
export const checkout = asyncHandler(async (req, res) => {
  const {
    amount,
    currency = "INR",
    couponCode,
    couponId,
    discountAmount,
    paymentGateway = "RAZORPAY", // Default to RAZORPAY
  } = req.body;
  const userId = req.user.id;

  if (!amount || amount < 1) {
    throw new ApiError(400, "Valid amount is required");
  }

  try {
    // Get payment gateway config from DB (use order owner's keys)
    // For now, using the user's own keys. Later can be extended for multi-merchant
    const paymentConfig = await getPaymentGatewayConfig(userId, paymentGateway);

    // Support RAZORPAY only (PhonePe temporarily disabled)
    if (paymentGateway.toUpperCase() !== "RAZORPAY") {
      throw new ApiError(400, "Only RAZORPAY is currently supported for checkout");
    }

    // Check if user has any previous canceled orders that might cause issues
    const existingCanceledOrders = await prisma.order.findMany({
      where: {
        userId,
        status: "CANCELLED",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
    });

    if (existingCanceledOrders.length > 0) {
      // Log information about canceled orders
      console.log("User has canceled orders, proceeding with clean checkout");
    }

    // Generate a short receipt ID (must be ≤ 40 chars for Razorpay)
    // Use a short timestamp and last 4 chars of userId
    const shortUserId = userId.slice(-4);
    const timestamp = Date.now().toString().slice(-10);
    const receipt = `rcpt_${timestamp}_${shortUserId}`;

    // Store coupon information in the receipt notes
    const notes = {};
    if (couponCode) {
      notes.couponCode = couponCode;
    }
    if (couponId) {
      notes.couponId = couponId;
    }
    if (discountAmount && discountAmount > 0) {
      notes.discountAmount = discountAmount;
    }
    // Store payment gateway info in notes
    notes.paymentGateway = paymentConfig.paymentSettings.gateway;
    notes.paymentMode = paymentConfig.paymentSettings.mode;
    notes.paymentOwnerId = paymentConfig.paymentSettings.userId;

    // Ensure amount has 2 decimal places for precise calculation
    // Then convert to paise (multiply by 100) and ensure it's an integer
    const decimalAmount = parseFloat(parseFloat(amount).toFixed(2));
    const amountInPaise = Math.round(decimalAmount * 100);

    const options = {
      amount: amountInPaise, // Razorpay takes amount in paise as integer
      currency,
      receipt: receipt,
      notes: Object.keys(notes).length > 0 ? notes : undefined,
    };

    const order = await paymentConfig.razorpayInstance.orders.create(options);

    if (!order) {
      throw new ApiError(500, "Error creating Razorpay order");
    }

    // Store the coupon information in the response
    const responseData = {
      ...order,
      couponData: Object.keys(notes).length > 0 ? notes : null,
    };

    res
      .status(200)
      .json(new ApiResponsive(200, responseData, "Order created successfully"));
  } catch (error) {
    console.error("Razorpay order creation error:", error);

    // Format error response properly
    let errorMessage = "Error creating Razorpay order";
    let errorDetails = [];

    if (error.error && error.error.description) {
      errorMessage = error.error.description;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new ApiError(500, errorMessage, errorDetails);
  }
});

// Verify payment and create order
export const paymentVerification = asyncHandler(async (req, res) => {
  // Extract parameters with fallbacks for both snake_case and camelCase formats
  const razorpay_order_id =
    req.body.razorpay_order_id || req.body.razorpayOrderId;
  const razorpay_payment_id =
    req.body.razorpay_payment_id || req.body.razorpayPaymentId;
  const razorpay_signature =
    req.body.razorpay_signature || req.body.razorpaySignature;
  const {
    shippingAddressId,
    billingAddressSameAsShipping = true,
    billingAddress,
    couponCode: requestCouponCode,
    couponId: requestCouponId,
    discountAmount: requestDiscount,
    notes,
  } = req.body;

  // Validation
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing payment details");
  }

  if (!shippingAddressId) {
    throw new ApiError(400, "Shipping address is required");
  }


  const userId = req.user.id;
  let paymentConfig;
  let paymentGateway = "RAZORPAY";
  let paymentMode = "TEST";
  let paymentOwnerId = userId;

  try {
    // Try to get payment gateway from request body or default to RAZORPAY
    paymentGateway = req.body.paymentGateway || "RAZORPAY";
    paymentConfig = await getPaymentGatewayConfig(userId, paymentGateway);
    paymentMode = paymentConfig.paymentSettings.mode;
    paymentOwnerId = paymentConfig.paymentSettings.userId;
  } catch (error) {
    throw new ApiError(400, error.message || "Payment gateway not configured");
  }

  // Verify signature using DB key
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", paymentConfig.paymentSettings.razorpayKeySecret)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new ApiError(400, "Invalid payment signature");
  }

  try {
    // Check if payment already processed
    const existingPayment = await prisma.razorpayPayment.findUnique({
      where: { razorpayPaymentId: razorpay_payment_id },
    });

    if (existingPayment) {
      throw new ApiError(400, "Payment already processed");
    }

    // Check for cancelled orders with this Razorpay order ID
    const cancelledOrder = await prisma.razorpayPayment.findFirst({
      where: {
        razorpayOrderId: razorpay_order_id,
        order: {
          status: "CANCELLED",
        },
      },
      include: {
        order: true,
      },
    });

    if (cancelledOrder) {
      console.log(
        `Detected payment for previously cancelled order: ${cancelledOrder.order.orderNumber}`
      );
      throw new ApiError(
        400,
        "This order was previously cancelled. Please start a new checkout process."
      );
    }

    if (!razorpay_signature) {
      throw new ApiError(400, "Razorpay signature is missing");
    }

    // Get user's cart items
    const userId = req.user.id;
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        productVariant: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
                pricingSlabs: {
                  orderBy: { minQty: 'desc' }
                }
              },
            },
            attributes: {
              include: {
                attributeValue: {
                  include: {
                    attribute: true,
                  },
                },
              },
            },
            pricingSlabs: {
              orderBy: { minQty: 'desc' }
            }
          },
        },
      },
    });

    if (!cartItems.length) {
      throw new ApiError(400, "No items in cart");
    }

    // Check if user has an active coupon
    const userCoupon = await prisma.userCoupon.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        coupon: true,
      },
    });

    // Verify shipping address
    const shippingAddress = await prisma.address.findFirst({
      where: {
        id: shippingAddressId,
        userId,
      },
    });

    if (!shippingAddress) {
      throw new ApiError(404, "Shipping address not found");
    }

    // Calculate order totals
    let subTotal = 0;
    let tax = 0; // Tax is now set to 0    
    let shippingCost = 0;


    let discount = 0;
    let couponCode = null;
    let couponId = null;

    // Helper to calculate effective price based on quantity (Slab Pricing)
    const calculateSlabPrice = (variant, quantity) => {
      const qty = parseInt(quantity);

      // 1. Check variant specific slabs
      if (variant.pricingSlabs && variant.pricingSlabs.length > 0) {
        // Since we ordered by desc in query, we can find the first match
        const match = variant.pricingSlabs.find(slab =>
          qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)
        );
        if (match) return parseFloat(match.price);
      }

      // 2. Check product specific slabs
      if (variant.product.pricingSlabs && variant.product.pricingSlabs.length > 0) {
        const match = variant.product.pricingSlabs.find(slab =>
          qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)
        );
        if (match) return parseFloat(match.price);
      }

      // 3. Fallback to default price
      return parseFloat(variant.salePrice || variant.price);
    };

    // Check inventory and calculate totals
    for (const item of cartItems) {
      const variant = item.productVariant;
      const price = calculateSlabPrice(variant, item.quantity);
      const itemTotal = price * item.quantity;
      subTotal += itemTotal;

      // Check stock availability
      if (variant.quantity < item.quantity) {
        throw new ApiError(400, `Not enough stock for ${variant.product.name}`);
      }
    }

    // Calculate shipping cost based on active shipping provider settings
    const parcelxSettings = await getParcelXSettings();
    const shiprocketSettings = await prisma.shiprocketSettings.findFirst();
    // Default to Shiprocket if ParcelX is not enabled
    let activeSettings = shiprocketSettings;
    if (parcelxSettings && parcelxSettings.isEnabled) {
      activeSettings = parcelxSettings;
    }

    if (activeSettings) {
      const threshold = parseFloat(activeSettings.freeShippingThreshold || 0);
      const charge = parseFloat(activeSettings.shippingCharge || 0);

      if (threshold > 0 && subTotal >= threshold) {
        shippingCost = 0;
      } else {
        shippingCost = charge;
      }
    }

    // fallback shipping (only if undefined)
    if (shippingCost === undefined || shippingCost === null) {
      shippingCost = 100;
    }

    // Apply coupon discount if available
    if (userCoupon && userCoupon.coupon) {
      couponCode = userCoupon.coupon.code;
      couponId = userCoupon.coupon.id;

      // Calculate discount based on coupon type
      if (userCoupon.coupon.discountType === "PERCENTAGE") {
        // Calculate percentage discount with cap if needed
        let discountPercentage = parseFloat(userCoupon.coupon.discountValue);

        if (discountPercentage > 90 || userCoupon.coupon.isDiscountCapped) {
          discountPercentage = Math.min(discountPercentage, 90);
        }

        discount = (subTotal * discountPercentage) / 100;
      } else {
        // Fixed amount discount, not exceeding subtotal
        discount = Math.min(
          parseFloat(userCoupon.coupon.discountValue),
          subTotal
        );
      }

      // After successful order, deactivate the coupon for this user
      // We'll do this in the transaction to ensure it only happens if order is created
    }
    // If no userCoupon but we have coupon info stored in the Razorpay order, use that
    else {
      try {
        // First check if direct coupon info was provided in the request
        if (requestCouponCode || requestCouponId || requestDiscount) {
          if (requestCouponCode) couponCode = requestCouponCode;
          if (requestCouponId) couponId = requestCouponId;
          if (requestDiscount) discount = parseFloat(requestDiscount);
        }
        // Fallback to Razorpay order notes
        else {
          // Fetch the Razorpay order to get notes using DB keys
          const razorpayOrderDetails = await paymentConfig.razorpayInstance.orders.fetch(
            razorpay_order_id
          );

          if (razorpayOrderDetails.notes) {
            // Get coupon information from notes
            if (razorpayOrderDetails.notes.couponCode) {
              couponCode = razorpayOrderDetails.notes.couponCode;
            }

            if (razorpayOrderDetails.notes.couponId) {
              couponId = razorpayOrderDetails.notes.couponId;
            }

            if (razorpayOrderDetails.notes.discountAmount) {
              discount = parseFloat(razorpayOrderDetails.notes.discountAmount);
            }

            // Get payment gateway info from notes
            if (razorpayOrderDetails.notes.paymentGateway) {
              paymentGateway = razorpayOrderDetails.notes.paymentGateway;
            }
            if (razorpayOrderDetails.notes.paymentMode) {
              paymentMode = razorpayOrderDetails.notes.paymentMode;
            }
            if (razorpayOrderDetails.notes.paymentOwnerId) {
              paymentOwnerId = razorpayOrderDetails.notes.paymentOwnerId;
            }
          }
        }

        // If we have couponId but no couponCode or vice versa, try to get the missing information
        if (couponId && !couponCode) {
          const coupon = await prisma.coupon.findUnique({
            where: { id: couponId },
          });
          if (coupon) {
            couponCode = coupon.code;
          }
        } else if (couponCode && !couponId) {
          const coupon = await prisma.coupon.findUnique({
            where: { code: couponCode },
          });
          if (coupon) {
            couponId = coupon.id;
          }
        }
      } catch (err) {
        console.log("Error processing coupon information:", err);
        // Continue with the process, just without coupon info
      }
    }

    // Tax is 0% now
    //tax = 0;  uncomment this to remove GST
    tax = subTotal * 0.18;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Use payment gateway info from above (already set)

    // Get Razorpay payment details using DB keys
    const razorpayPaymentDetails = await paymentConfig.razorpayInstance.payments.fetch(
      razorpay_payment_id
    );
    const paymentMethod = mapRazorpayMethod(razorpayPaymentDetails.method);

    // Create order and process payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subTotal: subTotal.toFixed(2),
          tax: tax.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          discount,
          paymentGateway,
          paymentMode,
          paymentOwnerId,
          // total: (subTotal + shippingCost - discount).toFixed(2),    unncomment this to remove GST
          total: (subTotal + tax + shippingCost - discount).toFixed(2),
          shippingAddressId,
          billingAddressSameAsShipping,
          billingAddress: !billingAddressSameAsShipping
            ? billingAddress
            : undefined,
          notes,
          status: "PAID",
          paymentMethod: paymentGateway === "PHONEPE" ? "PHONEPE" : "RAZORPAY",
          couponCode,
          couponId: couponId,
        },
      });

      // If a coupon was used, mark it as inactive for this user
      if (userCoupon && userCoupon.coupon) {
        await tx.userCoupon.update({
          where: {
            id: userCoupon.id,
          },
          data: {
            isActive: false,
          },
        });

        // Update the coupon's used count
        await tx.coupon.update({
          where: {
            id: userCoupon.coupon.id,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // 2. Create the Razorpay payment record
      const payment = await tx.razorpayPayment.create({
        data: {
          orderId: order.id,
          amount: (subTotal + tax + shippingCost - discount).toFixed(2),
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          status: "CAPTURED",
          paymentMethod,
          notes: razorpayPaymentDetails,
        },
      });

      // Note: Partner commissions will be created automatically when order status is updated to DELIVERED
      // This ensures partners only get paid after successful delivery, not just on payment

      // 3. Create order items and update inventory
      const orderItems = [];
      for (const item of cartItems) {
        const variant = item.productVariant;
        // Reuse the same helper from above
        let price = calculateSlabPrice(variant, item.quantity);
        let flashSaleInfo = null;

        // Check for active flash sale for this product
        const now = new Date();
        const flashSaleProduct = await tx.flashSaleProduct.findFirst({
          where: {
            productId: variant.product.id,
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
          const priceBeforeFlashSale = price;
          const discountAmount = (price * flashSaleProduct.flashSale.discountPercentage) / 100;
          price = Math.round((price - discountAmount) * 100) / 100;
          flashSaleInfo = {
            flashSaleId: flashSaleProduct.flashSale.id,
            flashSaleName: flashSaleProduct.flashSale.name,
            flashSaleDiscount: flashSaleProduct.flashSale.discountPercentage,
            originalPrice: priceBeforeFlashSale,
          };

          // Increment sold count for the flash sale
          await tx.flashSale.update({
            where: { id: flashSaleProduct.flashSale.id },
            data: { soldCount: { increment: item.quantity } },
          });
        }

        const subtotal = price * item.quantity;

        // Create order item
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: variant.product.id,
            variantId: variant.id,
            price,
            quantity: item.quantity,
            subtotal,
            ...(flashSaleInfo || {}),
          },
        });
        orderItems.push(orderItem);

        // Update inventory
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Log inventory change
        await tx.inventoryLog.create({
          data: {
            variantId: variant.id,
            quantityChange: -item.quantity,
            reason: "sale",
            referenceId: order.id,
            previousQuantity: variant.quantity,
            newQuantity: variant.quantity - item.quantity,
            createdBy: userId,
          },
        });
      }

      // 4. Clear the user's cart
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return { order, payment, orderItems };
    });

    // Process referral reward (outside transaction to avoid blocking)
    processReferralReward(result.order.id, userId).catch((err) => {
      console.error("Referral reward processing error:", err);
    });

    // Process shipping (outside transaction, non-blocking)
    const activeParcelxSettings = await getParcelXSettings();
    if (activeParcelxSettings.isEnabled) {
      processOrderForParcelX(result.order.id).catch((err) => {
        console.error("ParcelX order processing error:", err);
      });
    } else {
      // Fallback to Shiprocket
      processOrderForShipping(result.order.id).catch((err) => {
        console.error("Shiprocket order processing error:", err);
        // Non-critical - admin can manually sync later
      });
    }

    // Send order confirmation email
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.email) {
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: result.order.id },
          include: {
            product: true,
            variant: {
              include: {
                attributes: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: true
                      }
                    }
                  }
                },
                images: true
              },
            },
          },
        });

        // Format items for email
        const emailItems = orderItems.map((item) => ({
          name: item.product.name,
          variant: item.variant.attributes.map(attr =>
            `${attr.attributeValue.attribute.name}: ${attr.attributeValue.value}`
          ).join(", ") + (item.flashSaleName ? ` ⚡ ${item.flashSaleName}` : ""),
          quantity: item.quantity,
          price: parseFloat(item.price).toFixed(2),
          originalPrice: item.originalPrice ? parseFloat(item.originalPrice).toFixed(2) : null,
        }));

        // Send email
        await sendEmail({
          email: user.email,
          subject: `Order Confirmation - #${result.order.orderNumber}`,
          html: getOrderConfirmationTemplate({
            userName: user.name || "Valued Customer",
            orderNumber: result.order.orderNumber,
            orderDate: result.order.createdAt,
            paymentMethod: result.payment.paymentMethod || "Online",
            items: emailItems,
            subtotal: parseFloat(result.order.subTotal).toFixed(2),
            shipping: parseFloat(result.order.shippingCost || 0).toFixed(2),
            tax: parseFloat(result.order.tax || 0).toFixed(2),
            discount: parseFloat(result.order.discount || 0).toFixed(2),
            couponCode: result.order.couponCode || "",
            total: parseFloat(result.order.total).toFixed(2),
            shippingAddress: shippingAddress,
          }),
        });
      }
    } catch (emailError) {
      console.error("Order confirmation email error:", emailError);
      // Don't throw error, continue with response
    }

    // Return success response
    return res.status(200).json(
      new ApiResponsive(
        200,
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          paymentId: result.payment.id,
        },
        "Payment verified and order created successfully"
      )
    );
  } catch (error) {
    console.error("Payment Verification Error:", error);

    if (error.code === "P2002") {
      throw new ApiError(400, "Duplicate payment record");
    }

    if (error.code === "P2025") {
      throw new ApiError(404, "Related record not found");
    }

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Payment verification failed"
    );
  }
});

// Get order history
export const getOrderHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Get total count
  const totalOrders = await prisma.order.count({
    where: { userId },
  });

  // Get orders with pagination
  const orders = await prisma.order.findMany({
    where: { userId },
    include: {
      items: {
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
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          returnRequests: {
            select: {
              id: true,
              status: true,
              reason: true,
              customReason: true,
              createdAt: true,
              processedAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      tracking: true,
      razorpayPayment: {
        select: {
          paymentMethod: true,
          status: true,
          razorpayPaymentId: true,
        },
      },
      coupon: {
        select: {
          code: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });

  // Format response
  const formattedOrders = orders.map((order) => {
    // Ensure we use the original total without modifying it
    const originalTotal = parseFloat(order.total);

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      status: order.status,
      // Use the original stored total
      total: originalTotal,
      subTotal: parseFloat(order.subTotal),
      shippingCost: parseFloat(order.shippingCost) || 0,
      tax: parseFloat(order.tax) || 0,
      discount: parseFloat(order.discount) || 0,
      couponCode: order.couponCode || null,
      couponDetails: order.coupon
        ? {
          code: order.coupon.code,
          discountType: order.coupon.discountType,
          discountValue: parseFloat(order.coupon.discountValue),
        }
        : null,
      paymentMethod: order.paymentMethod === "CASH" ? "COD" : "Already Paid",
      paymentStatus: order.razorpayPayment?.status || order.status,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        image: item.product.images[0]
          ? getFileUrl(item.product.images[0].url)
          : null,
        slug: item.product.slug,
        // Extract all attributes dynamically
        attributes: (() => {
          if (!item.variant?.attributes) return {};
          const attributesMap = {};
          item.variant.attributes.forEach((vav) => {
            const attrName = vav.attributeValue?.attribute?.name;
            const attrValue = vav.attributeValue?.value;
            if (attrName && attrValue) {
              attributesMap[attrName] = attrValue;
            }
          });
          return attributesMap;
        })(),
        // Backward compatibility - keep color and size for existing code
        color: (() => {
          const colorAttr = item.variant?.attributes?.find(
            (attr) => attr.attributeValue?.attribute?.name === "Color"
          );
          return colorAttr?.attributeValue?.value || null;
        })(),
        size: (() => {
          const sizeAttr = item.variant?.attributes?.find(
            (attr) => attr.attributeValue?.attribute?.name === "Size"
          );
          return sizeAttr?.attributeValue?.value || null;
        })(),
        price: parseFloat(item.price),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
        // Flash sale info
        flashSale: item.flashSaleId ? {
          id: item.flashSaleId,
          name: item.flashSaleName,
          discountPercentage: item.flashSaleDiscount,
          originalPrice: item.originalPrice ? parseFloat(item.originalPrice) : null,
        } : null,
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
      })),
      tracking: order.tracking
        ? {
          carrier: order.tracking.carrier,
          trackingNumber: order.tracking.trackingNumber,
          status: order.tracking.status,
          estimatedDelivery: order.tracking.estimatedDelivery,
        }
        : null,
    };
  });

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
      "Order history fetched successfully"
    )
  );
});

// Get order details by ID
export const getOrderDetails = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;

  // Get order with details
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
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
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          // Include return requests for each item
          returnRequests: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      shippingAddress: true,
      tracking: {
        include: {
          updates: {
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      },
      razorpayPayment: true,
      coupon: {
        select: {
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

  // Format response - use original values to maintain historical pricing
  const formattedOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    date: order.createdAt,
    status: order.status,
    cancelReason: order.cancelReason || null,
    cancelledAt: order.cancelledAt || null,
    cancelledBy: order.cancelledBy || null,
    subTotal: parseFloat(order.subTotal),
    tax: parseFloat(order.tax),
    shippingCost: parseFloat(order.shippingCost),
    discount: parseFloat(order.discount) || 0,
    // Use the original total stored in the database to preserve historical pricing
    total: parseFloat(order.total),
    paymentMethod: order.paymentMethod === "CASH" ? "COD" : "Already Paid",
    paymentId: order.razorpayPayment?.razorpayPaymentId,
    paymentStatus: order.razorpayPayment?.status || order.status,
    notes: order.notes,
    couponCode: order.couponCode,
    couponId: order.couponId,
    // Add detailed coupon information
    couponDetails: order.coupon
      ? {
        code: order.coupon.code,
        description: order.coupon.description,
        discountType: order.coupon.discountType,
        discountValue: parseFloat(order.coupon.discountValue),
      }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product.name,
      image: item.product.images[0]
        ? getFileUrl(item.product.images[0].url)
        : null,
      slug: item.product.slug,
      color: item.variant.color?.name,
      size: item.variant.size?.name || null,
      price: parseFloat(item.price),
      quantity: item.quantity,
      subtotal: parseFloat(item.subtotal),
      // Flash sale info
      flashSale: item.flashSaleId ? {
        id: item.flashSaleId,
        name: item.flashSaleName,
        discountPercentage: item.flashSaleDiscount,
        originalPrice: item.originalPrice ? parseFloat(item.originalPrice) : null,
      } : null,
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
    })),
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddressSameAsShipping
      ? order.shippingAddress
      : order.billingAddress,
    tracking: order.tracking
      ? {
        carrier: order.tracking.carrier,
        trackingNumber: order.tracking.trackingNumber,
        status: order.tracking.status,
        estimatedDelivery: order.tracking.estimatedDelivery,
        updates: order.tracking.updates.map((update) => ({
          status: update.status,
          timestamp: update.timestamp,
          location: update.location,
          description: update.description,
        })),
      }
      : null,
  };

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        formattedOrder,
        "Order details fetched successfully"
      )
    );
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new ApiError(400, "Cancellation reason is required");
  }

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          variant: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Only allow cancellation for certain statuses (allow PAID if not yet shipped)
  const allowedStatuses = ["PENDING", "PROCESSING", "PAID"];
  if (!allowedStatuses.includes(order.status)) {
    throw new ApiError(400, "This order cannot be cancelled");
  }

  // Process cancellation in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        cancelReason: reason,
        cancelledAt: new Date(),
        cancelledBy: userId,
      },
    });

    // 2. Return items to inventory
    for (const item of order.items) {
      // Update inventory
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
          reason: "cancellation",
          referenceId: order.id,
          previousQuantity: item.variant.quantity,
          newQuantity: item.variant.quantity + item.quantity,
          createdBy: userId,
        },
      });
    }

    // 3. Handle payment refund if needed (just mark as refund pending)
    if (order.razorpayPayment) {
      await tx.razorpayPayment.update({
        where: { orderId },
        data: {
          status: "REFUNDED",
        },
      });
    }
  });

  // Cancel Shiprocket order if it exists (outside transaction, non-blocking)
  if (order.shiprocketOrderId) {
    try {
      const { cancelShiprocketOrder, getShiprocketSettings } = await import("../utils/shiprocket.js");
      const settings = await getShiprocketSettings();
      if (settings.isEnabled) {
        await cancelShiprocketOrder(order.shiprocketOrderId);
        // Update order shiprocket status
        await prisma.order.update({
          where: { id: orderId },
          data: { shiprocketStatus: "CANCELLED" },
        });
        console.log(`Shiprocket order ${order.shiprocketOrderId} cancelled`);
      }
    } catch (error) {
      console.error("Failed to cancel Shiprocket order:", error.message);
      // Non-critical - order is already cancelled in our system
    }
  }

  res
    .status(200)
    .json(
      new ApiResponsive(200, { success: true }, "Order cancelled successfully")
    );
});

// Create Cash on Delivery order
// PhonePe Callback Handler
export const phonePeCallback = asyncHandler(async (req, res) => {
  try {
    // PhonePe sends callback as POST with base64 encoded response
    const { response } = req.body;

    if (!response) {
      throw new ApiError(400, "Response data is required");
    }

    // Decode response
    const decodedResponse = JSON.parse(Buffer.from(response, "base64").toString());
    const {
      success,
      code,
      message,
      data
    } = decodedResponse;

    const transactionId = data?.merchantTransactionId;

    if (!transactionId) {
      throw new ApiError(400, "Transaction ID is required");
    }

    // Get stored transaction
    const storedTransaction = await prisma.phonePeTransaction.findUnique({
      where: { transactionId },
    });

    if (!storedTransaction) {
      throw new ApiError(404, "Transaction not found");
    }

    const orderData = JSON.parse(storedTransaction.orderData);

    // Check payment status
    if (success && code === "PAYMENT_SUCCESS") {
      // Payment successful - create order (similar to createCashOrder)
      const userId = orderData.userId;

      // Get cart items
      const cartItems = await prisma.cartItem.findMany({
        where: { userId },
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      });

      if (cartItems.length === 0) {
        throw new ApiError(400, "Cart is empty");
      }

      // Calculate totals
      let subTotal = 0;
      for (const item of cartItems) {
        const variant = item.productVariant;
        const price = parseFloat(variant.salePrice || variant.price);
        subTotal += price * item.quantity;
      }

      let discount = orderData.discountAmount || 0;
      const tax = 0;
      const shippingCost = 0;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Create order
      const result = await prisma.$transaction(async (tx) => {
        // Create order
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            subTotal: subTotal.toFixed(2),
            tax: tax.toFixed(2),
            shippingCost,
            discount,
            total: (subTotal - discount).toFixed(2),
            paymentMethod: "PHONEPE",
            paymentGateway: orderData.paymentGateway,
            paymentMode: orderData.paymentMode,
            paymentOwnerId: orderData.paymentOwnerId,
            shippingAddressId: orderData.shippingAddressId,
            billingAddressSameAsShipping: orderData.billingAddressSameAsShipping,
            status: "PAID",
            couponCode: orderData.couponCode,
            couponId: orderData.couponId,
            notes: JSON.stringify({
              phonepeTransactionId: transactionId,
              phonepePaymentId: data?.transactionId,
            }),
          },
        });

        // Create order items
        for (const item of cartItems) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              productVariantId: item.productVariantId,
              quantity: item.quantity,
              price: parseFloat(item.productVariant.salePrice || item.productVariant.price),
            },
          });

          // Update inventory
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });
        }

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { userId },
        });

        // Update transaction status
        await tx.phonePeTransaction.update({
          where: { transactionId },
          data: { status: "SUCCESS", orderId: order.id },
        });

        return order;
      });

      // Redirect to success page
      res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/account/orders?success=true&orderId=${result.id}`);
    } else {
      // Payment failed
      await prisma.phonePeTransaction.update({
        where: { transactionId },
        data: { status: "FAILED", errorMessage: message || code },
      });

      res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/payment/failed?transactionId=${transactionId}&error=${encodeURIComponent(message || code)}`);
    }
  } catch (error) {
    console.error("PhonePe callback error:", error);
    res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/payment/failed?error=${encodeURIComponent(error.message)}`);
  }
});

export const createCashOrder = asyncHandler(async (req, res) => {
  const {
    shippingAddressId,
    billingAddressSameAsShipping = true,
    billingAddress,
    couponCode: requestCouponCode,
    couponId: requestCouponId,
    discountAmount: requestDiscount,
    notes,
  } = req.body;

  if (!shippingAddressId) {
    throw new ApiError(400, "Shipping address is required");
  }

  // Check payment settings
  const paymentSettings = await prisma.paymentSettings.findFirst();
  if (!paymentSettings || !paymentSettings.cashEnabled) {
    throw new ApiError(400, "Cash on Delivery is not enabled");
  }

  try {
    // Get user's cart items
    const userId = req.user.id;
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        productVariant: {
          include: {
            product: {
              include: {
                images: {
                  where: { isPrimary: true },
                  take: 1,
                },
                pricingSlabs: {
                  orderBy: { minQty: 'desc' }
                }
              },
            },
            attributes: {
              include: {
                attributeValue: {
                  include: {
                    attribute: true,
                  },
                },
              },
            },
            pricingSlabs: {
              orderBy: { minQty: 'desc' }
            }
          },
        },
      },
    });

    if (!cartItems.length) {
      throw new ApiError(400, "No items in cart");
    }

    // Check if user has an active coupon
    const userCoupon = await prisma.userCoupon.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        coupon: true,
      },
    });

    // Verify shipping address
    const shippingAddress = await prisma.address.findFirst({
      where: {
        id: shippingAddressId,
        userId,
      },
    });

    if (!shippingAddress) {
      throw new ApiError(404, "Shipping address not found");
    }

    // Calculate order totals
    let subTotal = 0;
    let tax = 0;
    let shippingCost = 0;
    let discount = 0;
    let couponCode = null;
    let couponId = null;

    // Helper to calculate effective price based on quantity (Slab Pricing)
    const calculateSlabPrice = (variant, quantity) => {
      const qty = parseInt(quantity);

      // 1. Check variant specific slabs
      if (variant.pricingSlabs && variant.pricingSlabs.length > 0) {
        // Since we ordered by desc in query, we can find the first match
        const match = variant.pricingSlabs.find(slab =>
          qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)
        );
        if (match) return parseFloat(match.price);
      }

      // 2. Check product specific slabs
      if (variant.product.pricingSlabs && variant.product.pricingSlabs.length > 0) {
        const match = variant.product.pricingSlabs.find(slab =>
          qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)
        );
        if (match) return parseFloat(match.price);
      }

      // 3. Fallback to default price
      return parseFloat(variant.salePrice || variant.price);
    };

    // Check inventory and calculate totals
    const processedItems = [];
    const now = new Date();

    for (const item of cartItems) {
      const variant = item.productVariant;
      let price = calculateSlabPrice(variant, item.quantity);
      let flashSaleInfo = null;
      let priceBeforeFlashSale = price;

      // Check for active flash sale for this product
      const flashSaleProduct = await prisma.flashSaleProduct.findFirst({
        where: {
          productId: variant.product.id,
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
        const discountAmount = (price * flashSaleProduct.flashSale.discountPercentage) / 100;
        price = Math.round((price - discountAmount) * 100) / 100;
        flashSaleInfo = {
          flashSaleId: flashSaleProduct.flashSale.id,
          flashSaleName: flashSaleProduct.flashSale.name,
          flashSaleDiscount: flashSaleProduct.flashSale.discountPercentage,
          originalPrice: priceBeforeFlashSale,
        };
      }

      const itemTotal = price * item.quantity;
      subTotal += itemTotal;

      // Check stock availability
      if (variant.quantity < item.quantity) {
        throw new ApiError(400, `Not enough stock for ${variant.product.name}`);
      }

      processedItems.push({
        item,
        price,
        subtotal: itemTotal,
        flashSaleInfo
      });
    }

    // Calculate shipping cost based on active shipping provider settings
    const FREE_SHIPPING_THRESHOLD = 999;
    const SHIPPING_CHARGE = 100;

    if (subTotal >= FREE_SHIPPING_THRESHOLD) {
      shippingCost = 0;
    } else {
      shippingCost = SHIPPING_CHARGE;
    }
    if (shippingCost === undefined || shippingCost === null) {
      shippingCost = 100;
    }

    // Apply coupon discount if available
    if (userCoupon && userCoupon.coupon) {
      couponCode = userCoupon.coupon.code;
      couponId = userCoupon.coupon.id;

      if (userCoupon.coupon.discountType === "PERCENTAGE") {
        let discountPercentage = parseFloat(userCoupon.coupon.discountValue);
        if (discountPercentage > 90 || userCoupon.coupon.isDiscountCapped) {
          discountPercentage = Math.min(discountPercentage, 90);
        }
        discount = (subTotal * discountPercentage) / 100;
      } else {
        discount = Math.min(
          parseFloat(userCoupon.coupon.discountValue),
          subTotal
        );
      }
    } else if (requestCouponCode || requestCouponId || requestDiscount) {
      if (requestCouponCode) couponCode = requestCouponCode;
      if (requestCouponId) couponId = requestCouponId;
      if (requestDiscount) discount = parseFloat(requestDiscount);
    }

    // tax = 0;  uncomment this to remove gst
    tax = subTotal * 0.18;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Get COD charge from payment settings
    const codCharge = parseFloat(paymentSettings.codCharge) || 0;

    // Create order in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          subTotal: subTotal.toFixed(2),
          tax: tax.toFixed(2),
          shippingCost: shippingCost.toFixed(2),
          discount,
          codCharge: codCharge.toFixed(2),
          // total: (subTotal + shippingCost + codCharge - discount).toFixed(2),   uncomment this to remove GST 
          total: (subTotal + tax + shippingCost + codCharge - discount).toFixed(2),
          paymentMethod: "CASH",
          shippingAddressId,
          billingAddressSameAsShipping,
          billingAddress: !billingAddressSameAsShipping
            ? billingAddress
            : undefined,
          notes,
          status: "PENDING", // COD orders start as PENDING
          couponCode,
          couponId: couponId,
        },
      });

      // If a coupon was used, mark it as inactive for this user
      if (userCoupon && userCoupon.coupon) {
        await tx.userCoupon.update({
          where: {
            id: userCoupon.id,
          },
          data: {
            isActive: false,
          },
        });

        await tx.coupon.update({
          where: {
            id: userCoupon.coupon.id,
          },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // 2. Create order items and update inventory
      const orderItems = [];
      for (const processedItem of processedItems) {
        const { item, price, subtotal, flashSaleInfo } = processedItem;
        const variant = item.productVariant;

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: variant.product.id,
            variantId: variant.id,
            price,
            quantity: item.quantity,
            subtotal,
            ...(flashSaleInfo || {})
          },
        });
        orderItems.push(orderItem);

        // Update inventory
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Update Flash Sale Sold Count
        if (flashSaleInfo?.flashSaleId) {
          await tx.flashSale.update({
            where: { id: flashSaleInfo.flashSaleId },
            data: { soldCount: { increment: item.quantity } },
          });
        }

        // Log inventory change
        await tx.inventoryLog.create({
          data: {
            variantId: variant.id,
            quantityChange: -item.quantity,
            reason: "sale",
            referenceId: order.id,
            previousQuantity: variant.quantity,
            newQuantity: variant.quantity - item.quantity,
            createdBy: userId,
          },
        });
      }

      // 3. Clear the user's cart
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return { order, orderItems };
    });

    // Process referral reward (outside transaction to avoid blocking)
    processReferralReward(result.order.id, userId).catch((err) => {
      console.error("Referral reward processing error:", err);
    });

    // Process shipping (outside transaction, non-blocking)
    const activeParcelxSettings = await getParcelXSettings();
    if (activeParcelxSettings.isEnabled) {
      processOrderForParcelX(result.order.id).catch((err) => {
        console.error("ParcelX order processing error:", err);
      });
    } else {
      // Fallback to Shiprocket
      processOrderForShipping(result.order.id).catch((err) => {
        console.error("Shiprocket order processing error:", err);
        // Non-critical - admin can manually sync later
      });
    }

    // Send order confirmation email
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.email) {
        const orderItems = await prisma.orderItem.findMany({
          where: { orderId: result.order.id },
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
        });

        const emailItems = orderItems.map((item) => ({
          name: item.product.name,
          variant: item.variant.attributes
            .map((va) => va.attributeValue.value)
            .join(" "),
          quantity: item.quantity,
          price: parseFloat(item.price).toFixed(2),
        }));

        await sendEmail({
          email: user.email,
          subject: `Order Confirmation - #${result.order.orderNumber}`,
          html: getOrderConfirmationTemplate({
            userName: user.name || "Valued Customer",
            orderNumber: result.order.orderNumber,
            orderDate: result.order.createdAt,
            paymentMethod: "Cash on Delivery",
            items: emailItems,
            subtotal: parseFloat(result.order.subTotal).toFixed(2),
            shipping: parseFloat(result.order.shippingCost || 0).toFixed(2),
            tax: parseFloat(result.order.tax || 0).toFixed(2),
            discount: parseFloat(result.order.discount || 0).toFixed(2),
            codCharge: parseFloat(result.order.codCharge || 0).toFixed(2),
            couponCode: result.order.couponCode || "",
            total: parseFloat(result.order.total).toFixed(2),
            shippingAddress: shippingAddress,
          }),
        });
      }
    } catch (emailError) {
      console.error("Order confirmation email error:", emailError);
    }

    // Return success response
    return res.status(200).json(
      new ApiResponsive(
        200,
        {
          orderId: result.order.id,
          orderNumber: result.order.orderNumber,
          paymentMethod: "CASH",
        },
        "Cash on Delivery order created successfully"
      )
    );
  } catch (error) {
    console.error("Cash Order Creation Error:", error);

    if (error.code === "P2002") {
      throw new ApiError(400, "Duplicate order record");
    }

    if (error.code === "P2025") {
      throw new ApiError(404, "Related record not found");
    }

    throw new ApiError(
      error.statusCode || 500,
      error.message || "Cash order creation failed"
    );
  }
});

// Helper function to map Razorpay payment method to our enum
function mapRazorpayMethod(method) {
  const methodMap = {
    card: "CARD",
    netbanking: "NETBANKING",
    wallet: "WALLET",
    upi: "UPI",
    emi: "EMI",
  };

  return methodMap[method] || "OTHER";
}
