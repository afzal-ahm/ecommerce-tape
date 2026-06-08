import crypto from "crypto";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decrypt } from "../utils/encryption.js";
import sendEmail from "../utils/sendEmail.js";
import { getOrderConfirmationTemplate } from "../email/temp/EmailTemplate.js";
import { processReferralReward } from "./referral.controller.js";
import { processOrderForShipping } from "../utils/shiprocket.js";
import { processOrderForParcelX, getParcelXSettings } from "../utils/parcelx.js";

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

// Helper to calculate effective price based on quantity (Slab Pricing)
const calculateSlabPrice = (variant, quantity) => {
  const qty = parseInt(quantity);

  // 1. Check variant specific slabs
  if (variant.pricingSlabs && variant.pricingSlabs.length > 0) {
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

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  // Fetch active Razorpay settings to get webhook secret
  const razorpaySetting = await prisma.paymentGatewaySetting.findFirst({
    where: {
      gateway: "RAZORPAY",
      isActive: true,
    },
  });

  if (!razorpaySetting || !razorpaySetting.razorpayWebhookSecret) {
    console.error("Razorpay active settings or webhook secret not configured in database");
    return res.status(200).json({ status: "ignored", message: "Webhook secret not configured" });
  }

  let decryptedWebhookSecret;
  try {
    decryptedWebhookSecret = decrypt(razorpaySetting.razorpayWebhookSecret);
  } catch (decryptError) {
    console.error("Error decrypting Razorpay webhook secret:", decryptError);
    return res.status(200).json({ status: "error", message: "Failed to decrypt webhook secret" });
  }

  // Verify signature
  const signature = req.headers["x-razorpay-signature"];
  if (!signature) {
    console.error("Missing x-razorpay-signature header");
    throw new ApiError(400, "Missing signature");
  }

  // Verification using rawBody if available, fallback to stringified body
  const payload = req.rawBody ? req.rawBody : JSON.stringify(req.body);
  const shasum = crypto.createHmac("sha256", decryptedWebhookSecret);
  shasum.update(payload);
  const digest = shasum.digest("hex");

  if (digest !== signature) {
    console.error("Razorpay webhook signature verification failed", { digest, signature });
    throw new ApiError(400, "Invalid signature");
  }

  const event = req.body.event;
  console.log(`Razorpay webhook signature verified. Processing event: ${event}`);

  // We are primarily interested in payment.captured and order.paid
  if (event !== "payment.captured" && event !== "order.paid") {
    return res.status(200).json({ status: "ok", message: `Event ${event} received and ignored` });
  }

  const paymentEntity = req.body.payload?.payment?.entity;
  const orderEntity = req.body.payload?.order?.entity;

  const razorpayPaymentId = paymentEntity?.id;
  const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

  if (!razorpayPaymentId || !razorpayOrderId) {
    console.warn("Webhook payload missing payment ID or order ID", { razorpayPaymentId, razorpayOrderId });
    return res.status(200).json({ status: "ok", message: "Missing identifiers" });
  }

  // 1. Check if payment was already processed
  const existingPayment = await prisma.razorpayPayment.findFirst({
    where: {
      OR: [
        { razorpayPaymentId },
        { razorpayOrderId }
      ]
    },
  });

  if (existingPayment) {
    console.log(`Razorpay payment ${razorpayPaymentId} / order ${razorpayOrderId} already exists in DB, skipping creation`);
    return res.status(200).json({ status: "ok", message: "Payment already processed" });
  }

  // Extract notes
  const notes = orderEntity?.notes || paymentEntity?.notes || {};
  const userId = notes.userId;

  if (!userId) {
    console.warn(`Webhook received for order ${razorpayOrderId} but no userId found in notes. Cannot recover order creation.`);
    return res.status(200).json({ status: "ok", message: "User ID missing in notes" });
  }

  // Fetch User
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    console.warn(`User with ID ${userId} not found for webhook recovery`);
    return res.status(200).json({ status: "ok", message: "User not found" });
  }

  // Resolve Cart Items
  let cartItems = [];
  if (notes.cartItems) {
    try {
      cartItems = typeof notes.cartItems === "string" ? JSON.parse(notes.cartItems) : notes.cartItems;
    } catch (parseErr) {
      console.error("Error parsing cart items from notes", parseErr);
    }
  }

  // Fallback to active cart items if notes didn't have any
  if (!cartItems || cartItems.length === 0) {
    const dbCartItems = await prisma.cartItem.findMany({
      where: { userId },
    });
    cartItems = dbCartItems.map(item => ({
      productVariantId: item.productVariantId,
      quantity: item.quantity,
    }));
  }

  if (!cartItems || cartItems.length === 0) {
    console.warn(`No cart items found for user ${userId} to create webhook order`);
    return res.status(200).json({ status: "ok", message: "Cart is empty" });
  }

  // Fetch db variants for validation & pricing
  const variantIds = cartItems.map(item => item.productVariantId);
  const dbVariants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: {
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          pricingSlabs: {
            orderBy: { minQty: 'desc' },
          },
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
        orderBy: { minQty: 'desc' },
      },
    },
  });

  const mappedCartItems = [];
  for (const item of cartItems) {
    const dbVariant = dbVariants.find(v => v.id === item.productVariantId);
    if (!dbVariant) {
      console.warn(`Variant ${item.productVariantId} not found in DB`);
      continue;
    }
    mappedCartItems.push({
      productVariant: dbVariant,
      quantity: item.quantity,
    });
  }

  if (mappedCartItems.length === 0) {
    console.error("None of the cart item variants were found in database, aborting order creation");
    return res.status(200).json({ status: "error", message: "Variants not found" });
  }

  // Resolve Shipping Address
  let shippingAddressId = notes.shippingAddressId;
  if (!shippingAddressId) {
    const defaultAddress = await prisma.address.findFirst({
      where: { userId, isDefault: true },
    });
    const firstAddress = await prisma.address.findFirst({
      where: { userId },
    });
    shippingAddressId = defaultAddress?.id || firstAddress?.id;
  }

  if (!shippingAddressId) {
    console.warn(`No shipping address found for user ${userId}`);
    return res.status(200).json({ status: "ok", message: "Shipping address not found" });
  }

  const shippingAddress = await prisma.address.findFirst({
    where: {
      id: shippingAddressId,
      userId,
    },
  });

  if (!shippingAddress) {
    console.warn(`Shipping address ${shippingAddressId} not found for user ${userId}`);
    return res.status(200).json({ status: "ok", message: "Address not found" });
  }

  // Parse billing details
  const billingAddressSameAsShipping = notes.billingAddressSameAsShipping === "true";
  let billingAddress = undefined;
  if (notes.billingAddress) {
    try {
      billingAddress = typeof notes.billingAddress === "string" ? JSON.parse(notes.billingAddress) : notes.billingAddress;
    } catch (err) {
      console.error("Error parsing billing address from notes", err);
    }
  }

  // Calculate Subtotal
  let subTotal = 0;
  for (const item of mappedCartItems) {
    const price = calculateSlabPrice(item.productVariant, item.quantity);
    subTotal += price * item.quantity;
  }

  // Calculate Shipping Cost
  let shippingCost = 0;
  const parcelxSettings = await getParcelXSettings();
  const shiprocketSettings = await prisma.shiprocketSettings.findFirst();
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

  // Coupon configuration
  let couponCode = notes.couponCode || null;
  let couponId = notes.couponId || null;
  let discount = parseFloat(notes.discountAmount || 0);

  // Validate coupon details if code/id missing
  if (couponId && !couponCode) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });
    if (coupon) couponCode = coupon.code;
  } else if (couponCode && !couponId) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode },
    });
    if (coupon) couponId = coupon.id;
  }

  // Tax calculation (18% GST)
  const tax = subTotal * 0.18;

  // Generate Order number
  const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Payment configuration
  const paymentGateway = notes.paymentGateway || "RAZORPAY";
  const paymentMode = notes.paymentMode || razorpaySetting.mode;
  const paymentOwnerId = notes.paymentOwnerId || razorpaySetting.userId;
  const paymentMethod = mapRazorpayMethod(paymentEntity?.method);

  // Parse Invoice requirements
  const requiresInvoice = notes.requiresInvoice === "true";
  const companyName = notes.companyName || null;
  const companyAddress = notes.companyAddress || null;
  const companyGstNumber = notes.companyGstNumber || null;
  const companyEmail = notes.companyEmail || null;
  const companyPhone = notes.companyPhone || null;

  try {
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
          total: (subTotal + tax + shippingCost - discount).toFixed(2),
          shippingAddressId,
          billingAddressSameAsShipping,
          billingAddress: !billingAddressSameAsShipping ? billingAddress : undefined,
          notes: notes.notes || "",
          status: "PAID",
          paymentMethod: "RAZORPAY",
          couponCode,
          couponId,
        },
      });

      // 2. Create invoice if needed
      if (requiresInvoice) {
        await tx.orderInvoice.create({
          data: {
            orderId: order.id,
            companyName,
            companyAddress,
            companyGstNumber,
            companyEmail,
            companyPhone,
          },
        });
      }

      // 3. Mark coupon used
      if (couponId) {
        const userCoupon = await tx.userCoupon.findFirst({
          where: {
            userId,
            couponId,
            isActive: true,
          },
        });

        if (userCoupon) {
          await tx.userCoupon.update({
            where: { id: userCoupon.id },
            data: { isActive: false },
          });
        }

        await tx.coupon.update({
          where: { id: couponId },
          data: {
            usedCount: { increment: 1 },
          },
        });
      }

      // 4. Create the RazorpayPayment record
      const payment = await tx.razorpayPayment.create({
        data: {
          orderId: order.id,
          amount: (subTotal + tax + shippingCost - discount).toFixed(2),
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature: "WEBHOOK",
          status: "CAPTURED",
          paymentMethod,
          notes: paymentEntity,
        },
      });

      // 5. Create order items and update inventory
      const orderItems = [];
      for (const item of mappedCartItems) {
        const variant = item.productVariant;
        let price = calculateSlabPrice(variant, item.quantity);
        let flashSaleInfo = null;

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

          await tx.flashSale.update({
            where: { id: flashSaleProduct.flashSale.id },
            data: { soldCount: { increment: item.quantity } },
          });
        }

        const itemSubtotal = price * item.quantity;

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: variant.product.id,
            variantId: variant.id,
            price,
            quantity: item.quantity,
            subtotal: itemSubtotal,
            ...(flashSaleInfo || {}),
          },
        });
        orderItems.push(orderItem);

        // Update inventory (even if stock goes negative, as payment has succeeded)
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

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

      // 6. Clear user cart
      await tx.cartItem.deleteMany({
        where: { userId },
      });

      return { order, payment, orderItems };
    });

    console.log(`Successfully created recovery order #${result.order.orderNumber} for user ${userId} via webhook`);

    // Process referral reward (non-blocking)
    processReferralReward(result.order.id, userId).catch((err) => {
      console.error("Referral reward processing error in webhook:", err);
    });

    // Process shipping (non-blocking)
    const activeParcelxSettings = await getParcelXSettings();
    if (activeParcelxSettings.isEnabled) {
      processOrderForParcelX(result.order.id).catch((err) => {
        console.error("ParcelX order processing error in webhook:", err);
      });
    } else {
      processOrderForShipping(result.order.id).catch((err) => {
        console.error("Shiprocket order processing error in webhook:", err);
      });
    }

    // Send order confirmation email
    try {
      if (user.email) {
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
                images: true,
              },
            },
          },
        });

        const emailItems = orderItems.map((item) => ({
          name: item.product.name,
          variant: item.variant.attributes.map(attr =>
            `${attr.attributeValue.attribute.name}: ${attr.attributeValue.value}`
          ).join(", ") + (item.flashSaleName ? ` ⚡ ${item.flashSaleName}` : ""),
          quantity: item.quantity,
          price: parseFloat(item.price).toFixed(2),
          originalPrice: item.originalPrice ? parseFloat(item.originalPrice).toFixed(2) : null,
        }));

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
      console.error("Order confirmation email error in webhook:", emailError);
    }

    return res.status(200).json({ status: "ok", message: "Order recovery successful" });
  } catch (error) {
    // Handle database concurrency (unique constraint P2002 on razorpayOrderId or similar)
    if (error.code === "P2002" || error.message?.includes("Unique constraint")) {
      console.log(`Order for Razorpay Order ID ${razorpayOrderId} was created concurrently by a parallel event. Safe to ignore.`);
      return res.status(200).json({ status: "ok", message: "Order processed concurrently" });
    }

    console.error("Razorpay webhook order recovery transaction failed:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});
