/**
 * ParcelX API Service
 * Handles all communication with ParcelX's shipping API
 *
 * Base URL: https://api.parcelx.in/v1 (Can be changed in settings)
 */

import { prisma } from "../config/db.js";

/**
 * Get ParcelX settings from database
 */
export async function getParcelXSettings() {
    let settings = await prisma.parcelXSettings.findFirst();

    if (!settings) {
        // Create default settings if none exist
        settings = await prisma.parcelXSettings.create({
            data: {
                isEnabled: false,
                defaultLength: 10,
                defaultBreadth: 10,
                defaultHeight: 10,
                defaultWeight: 0.5,
            },
        });
    }

    return settings;
}

/**
 * Get default ParcelX pickup address from database
 */
export async function getDefaultParcelXPickupAddress() {
    return prisma.parcelXPickupAddress.findFirst({
        where: { isDefault: true },
    });
}

/**
 * Make authenticated request to ParcelX API
 */
async function parcelxRequest(endpoint, method = "GET", body = null) {
    const settings = await getParcelXSettings();

    if (!settings.apiKey) {
        throw new Error("ParcelX API credentials not configured");
    }

    const baseUrl = settings.baseUrl || "https://api.parcelx.in/v1";

    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${settings.apiKey}`,
        },
    };

    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }

    const url =
        method === "GET" && body
            ? `${baseUrl}${endpoint}?${new URLSearchParams(body)}`
            : `${baseUrl}${endpoint}`;

    const response = await fetch(url, options);

    // Some ParcelX APIs might return 204 or empty response
    let data = {};
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    }

    if (!response.ok) {
        throw new Error(data.message || `ParcelX API error: ${response.status}`);
    }

    return data;
}

/**
 * Check courier serviceability for a shipment
 */
export async function checkServiceability({
    pickupPincode,
    deliveryPincode,
    weight,
    cod = false,
}) {
    const params = {
        pickup_pincode: pickupPincode,
        delivery_pincode: deliveryPincode,
        weight: weight * 1000, // Convert to grams
        payment_mode: cod ? "C" : "P",
    };

    return parcelxRequest("/shipment/serviceability", "POST", params);
}

/**
 * Create order in ParcelX (Manifestation)
 */
export async function createParcelXOrder(orderData) {
    return parcelxRequest("/shipment/create", "POST", orderData);
}

/**
 * Track shipment by Waybill/AWB code
 */
export async function trackShipment(waybill) {
    return parcelxRequest(`/shipment/track/${waybill}`, "GET");
}

/**
 * Cancel order in ParcelX
 */
export async function cancelParcelXOrder(waybill) {
    return parcelxRequest("/shipment/cancel", "POST", {
        waybill: waybill,
    });
}

/**
 * Generate shipping label
 */
export async function generateLabel(waybill) {
    return parcelxRequest(`/shipment/label/${waybill}`, "GET");
}

/**
 * Build order payload for ParcelX from our Order
 */
export async function buildParcelXOrderPayload(order) {
    const settings = await getParcelXSettings();
    const pickupAddress = await getDefaultParcelXPickupAddress();

    if (!pickupAddress) {
        throw new Error("No ParcelX pickup address configured");
    }

    // Get shipping address
    const shippingAddress = order.shippingAddress;
    if (!shippingAddress) {
        throw new Error("No shipping address for order");
    }

    // Calculate total weight and dimensions
    let totalWeight = 0;
    let maxLength = settings.defaultLength;
    let maxBreadth = settings.defaultBreadth;
    let totalHeight = 0;

    const orderItems = [];

    for (const item of order.items) {
        const variant = item.variant;

        // Use variant dimensions or defaults
        const length = variant.shippingLength || settings.defaultLength;
        const breadth = variant.shippingBreadth || settings.defaultBreadth;
        const height = variant.shippingHeight || settings.defaultHeight;
        const weight = variant.shippingWeight || settings.defaultWeight;

        totalWeight += weight * item.quantity;
        maxLength = Math.max(maxLength, length);
        maxBreadth = Math.max(maxBreadth, breadth);
        totalHeight += height * item.quantity;

        orderItems.push({
            name: item.product.name,
            sku: variant.sku,
            quantity: item.quantity,
            price: parseFloat(item.price),
        });
    }

    // Build the payload
    const payload = {
        client_order_id: order.orderNumber,
        pickup_location: pickupAddress.nickname,
        payment_mode: order.paymentMethod === "CASH" ? "C" : "P",
        cod_amount: order.paymentMethod === "CASH" ? parseFloat(order.total) : 0,

        // Dimensions
        length: maxLength,
        width: maxBreadth,
        height: Math.min(totalHeight, 100),
        weight: totalWeight * 1000, // Convert kg to grams

        // Consignee details
        consignee_details: {
            name: shippingAddress.name || order.user.name || "Customer",
            address_line_1: shippingAddress.street,
            address_line_2: shippingAddress.address2 || "",
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.postalCode,
            phone: shippingAddress.phone || order.user.phone || "",
            email: order.user.email || "",
        },

        // Order items
        items: orderItems,
    };

    return payload;
}

/**
 * Process order for ParcelX (create order)
 */
export async function processOrderForParcelX(orderId) {
    const settings = await getParcelXSettings();

    if (!settings.isEnabled) {
        console.log("ParcelX is disabled, skipping shipping integration");
        return null;
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            user: true,
            shippingAddress: true,
            items: {
                include: {
                    product: true,
                    variant: true,
                },
            },
        },
    });

    if (!order) {
        throw new Error("Order not found");
    }

    try {
        // Build and send order to ParcelX
        const payload = await buildParcelXOrderPayload(order);
        const parcelxResponse = await createParcelXOrder(payload);

        // Update order with ParcelX details
        await prisma.order.update({
            where: { id: orderId },
            data: {
                parcelxWaybill: parcelxResponse.data?.waybill,
                parcelxStatus: "MANIFESTED",
                awbCode: parcelxResponse.data?.waybill, // Keep for compatibility
                courierName: parcelxResponse.data?.courier_name, // Keep for compatibility
                shippingProvider: "PARCELX",
                status: "PROCESSING",
            },
        });

        return parcelxResponse;
    } catch (error) {
        console.error("Failed to process order for ParcelX:", error);
        throw error;
    }
}
