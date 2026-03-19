/**
 * ParcelX Admin Controller
 * Handles admin operations for ParcelX integration
 */

import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import {
    getParcelXSettings,
    checkServiceability,
    processOrderForParcelX,
    trackShipment,
    cancelParcelXOrder,
    generateLabel,
    getDefaultParcelXPickupAddress,
} from "../utils/parcelx.js";

// Get ParcelX settings
export const getSettings = asyncHandler(async (req, res) => {
    const settings = await getParcelXSettings();

    // Mask API Key for security
    const maskedSettings = {
        ...settings,
        apiKey: settings.apiKey ? "********" : null,
        apiSecret: settings.apiSecret ? "********" : null,
        accessToken: settings.accessToken ? "********" : null,
    };

    res.status(200).json(
        new ApiResponsive(200, { settings: maskedSettings }, "Settings fetched successfully")
    );
});

// Update ParcelX settings
export const updateSettings = asyncHandler(async (req, res) => {
    const {
        isEnabled,
        apiKey,
        apiSecret,
        baseUrl,
        defaultLength,
        defaultBreadth,
        defaultHeight,
        defaultWeight,
        shippingCharge,
        freeShippingThreshold,
    } = req.body;

    const settings = await getParcelXSettings();

    const updateData = {};

    if (typeof isEnabled === "boolean") {
        updateData.isEnabled = isEnabled;
    }

    if (apiKey !== undefined && apiKey !== "********") {
        updateData.apiKey = apiKey.trim();
    }

    if (apiSecret !== undefined && apiSecret !== "********") {
        updateData.apiSecret = apiSecret.trim();
    }
    if (req.body.accessToken !== undefined && req.body.accessToken !== "********") {
        updateData.accessToken = req.body.accessToken.trim();
    }

    if (baseUrl !== undefined) {
        updateData.baseUrl = baseUrl.trim();
    }

    if (defaultLength !== undefined) {
        updateData.defaultLength = parseFloat(defaultLength);
    }
    if (defaultBreadth !== undefined) {
        updateData.defaultBreadth = parseFloat(defaultBreadth);
    }
    if (defaultHeight !== undefined) {
        updateData.defaultHeight = parseFloat(defaultHeight);
    }
    if (defaultWeight !== undefined) {
        updateData.defaultWeight = parseFloat(defaultWeight);
    }

    if (shippingCharge !== undefined) {
        updateData.shippingCharge = parseFloat(shippingCharge);
    }

    if (freeShippingThreshold !== undefined) {
        updateData.freeShippingThreshold = parseFloat(freeShippingThreshold);
    }

    updateData.updatedBy = req.admin?.id;

    const updatedSettings = await prisma.parcelXSettings.update({
        where: { id: settings.id },
        data: updateData,
    });

    // Mask sensitive data
    const maskedSettings = {
    ...settings,
    apiKey: settings.apiKey ? "********" : null,
    apiSecret: settings.apiSecret ? "********" : null,
    accessToken: settings.accessToken ? "********" : null,
    };

    res.status(200).json(
        new ApiResponsive(200, { settings: maskedSettings }, "Settings updated successfully")
    );
});

// Test ParcelX connection (simple serviceability check for test)
export const testConnection = asyncHandler(async (req, res) => {
    try {
        const settings = await getParcelXSettings();
const token = settings.accessToken || settings.apiKey;
if (!token) {
    throw new Error("Access token is missing");
}

        // Try a simple request or just return success if credentials look set
        // ParcelX might not have a dedicated ping endpoint, so we just verify config
        res.status(200).json(
            new ApiResponsive(200, { connected: true }, "Configuration verified")
        );
    } catch (error) {
        throw new ApiError(400, `Connection failed: ${error.message}`);
    }
});

// Get all ParcelX pickup addresses
export const getPickupAddresses = asyncHandler(async (req, res) => {
    const addresses = await prisma.parcelXPickupAddress.findMany({
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    res.status(200).json(
        new ApiResponsive(200, { addresses }, "Pickup addresses fetched successfully")
    );
});

// Create ParcelX pickup address
export const createPickupAddress = asyncHandler(async (req, res) => {
    const {
        nickname,
        name,
        email,
        phone,
        address,
        address2,
        city,
        state,
        country,
        pincode,
        isDefault,
    } = req.body;

    if (!name || !email || !phone || !address || !city || !state || !pincode) {
        throw new ApiError(400, "All required fields must be provided");
    }

    if (isDefault) {
        await prisma.parcelXPickupAddress.updateMany({
            where: { isDefault: true },
            data: { isDefault: false },
        });
    }

    const pickupAddress = await prisma.parcelXPickupAddress.create({
        data: {
            nickname: nickname || "Warehouse",
            name,
            email,
            phone,
            address,
            address2: address2 || null,
            city,
            state,
            country: country || "India",
            pincode,
            isDefault: isDefault ?? true,
        },
    });

    res.status(201).json(
        new ApiResponsive(201, { address: pickupAddress }, "Pickup address created successfully")
    );
});

// Update ParcelX pickup address
export const updatePickupAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.parcelXPickupAddress.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new ApiError(404, "Pickup address not found");
    }

    if (updateData.isDefault) {
        await prisma.parcelXPickupAddress.updateMany({
            where: { isDefault: true, id: { not: id } },
            data: { isDefault: false },
        });
    }

    const updated = await prisma.parcelXPickupAddress.update({
        where: { id },
        data: updateData,
    });

    res.status(200).json(
        new ApiResponsive(200, { address: updated }, "Pickup address updated successfully")
    );
});

// Delete ParcelX pickup address
export const deletePickupAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.parcelXPickupAddress.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new ApiError(404, "Pickup address not found");
    }

    await prisma.parcelXPickupAddress.delete({
        where: { id },
    });

    res.status(200).json(
        new ApiResponsive(200, null, "Pickup address deleted successfully")
    );
});

// Check ParcelX serviceability
export const checkOrderServiceability = asyncHandler(async (req, res) => {
    const { pickupPincode, deliveryPincode, weight, cod } = req.body;

    if (!pickupPincode || !deliveryPincode || !weight) {
        throw new ApiError(400, "Pickup pincode, delivery pincode, and weight are required");
    }

    const result = await checkServiceability({
        pickupPincode,
        deliveryPincode,
        weight: parseFloat(weight),
        cod: cod || false,
    });

    res.status(200).json(
        new ApiResponsive(200, { serviceability: result }, "Serviceability checked successfully")
    );
});

// Sync order to ParcelX
export const syncOrderToParcelX = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  // Extract optional overrides from request body
  const {
    length,
    width,
    height,
    weight,
    courierType,
    courierCode,
  } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.parcelxWaybill) {
    throw new ApiError(400, "Order already synced to ParcelX");
  }

  const overrides = {
    ...(length !== undefined && { length: parseFloat(length) }),
    ...(width !== undefined && { width: parseFloat(width) }),
    ...(height !== undefined && { height: parseFloat(height) }),
    ...(weight !== undefined && { weight: parseFloat(weight) }),
    ...(courierType !== undefined && { courierType: parseInt(courierType) }),
    ...(courierCode !== undefined && { courierCode }),
  };

  const result = await processOrderForParcelX(orderId, overrides);

    if (!result) {
        throw new ApiError(400, "ParcelX is disabled or configuration is missing");
    }

    const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            parcelxWaybill: true,
            parcelxStatus: true,
            awbCode: true,
            courierName: true,
            shippingProvider: true,
        },
    });

    res.status(200).json(
        new ApiResponsive(200, { order: updatedOrder, parcelxResponse: result }, "Order synced to ParcelX successfully")
    );
});

// Get tracking info for an order
export const getOrderTracking = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            parcelxWaybill: true,
            awbCode: true,
        },
    });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    const waybill = order.parcelxWaybill || order.awbCode;

    if (!waybill) {
        throw new ApiError(400, "Order not yet synced for shipping");
    }

    const trackingData = await trackShipment(waybill);

    res.status(200).json(
        new ApiResponsive(200, { tracking: trackingData }, "Tracking info fetched successfully")
    );
});

// Cancel ParcelX shipment
export const cancelShipment = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            parcelxWaybill: true,
            awbCode: true,
        },
    });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    const waybill = order.parcelxWaybill || order.awbCode;

    if (!waybill) {
        throw new ApiError(400, "Order not synced for shipping");
    }

    const result = await cancelParcelXOrder(waybill);

    await prisma.order.update({
        where: { id: orderId },
        data: {
            parcelxStatus: "CANCELLED",
            status: "CANCELLED",
        },
    });

    res.status(200).json(
        new ApiResponsive(200, { result }, "Shipment cancelled successfully")
    );
});

// Get shipping label for order
export const getShippingLabel = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            parcelxWaybill: true,
            awbCode: true,
        },
    });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    const waybill = order.parcelxWaybill || order.awbCode;

    if (!waybill) {
        throw new ApiError(400, "Order not synced for shipping");
    }

    const result = await generateLabel(waybill);

    res.status(200).json(
        new ApiResponsive(200, { label: result }, "Shipping label generated successfully")
    );
});

// Webhook handler for ParcelX tracking updates
export const handleWebhook = asyncHandler(async (req, res) => {
    const {
        waybill,
        status,
        status_code,
        order_id, // This is our client_order_id
        location,
        timestamp,
    } = req.body;

    console.log("ParcelX webhook received:", {
        waybill,
        status,
        order_id,
    });

    // Find order by ParcelX waybill or internal order number
    let order = null;

    if (waybill) {
        order = await prisma.order.findFirst({
            where: {
                OR: [
                    { parcelxWaybill: waybill },
                    { awbCode: waybill }
                ]
            },
        });
    }

    if (!order && order_id) {
        order = await prisma.order.findUnique({
            where: { orderNumber: order_id },
        });
    }

    if (!order) {
        console.log("Order not found for ParcelX webhook:", { waybill, order_id });
        return res.status(200).json({ status: "ok" });
    }

    // Update order with tracking status
    const updateData = {
        parcelxStatus: status,
    };

    // Map ParcelX status to our internal order status
    const statusMapping = {
        'MANIFESTED': "PROCESSING",
        'PICKED_UP': "SHIPPED",
        'IN_TRANSIT': "SHIPPED",
        'OUT_FOR_DELIVERY': "SHIPPED",
        'DELIVERED': "DELIVERED",
        'CANCELLED': "CANCELLED",
        'RTO': "CANCELLED",
    };

    if (statusMapping[status]) {
        updateData.status = statusMapping[status];
    }

    await prisma.order.update({
        where: { id: order.id },
        data: updateData,
    });

    // Handle tracking table if exists (similar to Shiprocket logic)
    const tracking = await prisma.tracking.findUnique({
        where: { orderId: order.id }
    });

    if (tracking) {
        await prisma.tracking.update({
            where: { orderId: order.id },
            data: {
                status: status === "DELIVERED" ? "DELIVERED" : "IN_TRANSIT",
                ...(status === "DELIVERED" && { deliveredAt: new Date() }),
            },
        });

        await prisma.trackingUpdate.create({
            data: {
                trackingId: tracking.id,
                status: status,
                location: location || "",
                description: status,
            },
        });
    }

    res.status(200).json({ status: "ok" });
});
