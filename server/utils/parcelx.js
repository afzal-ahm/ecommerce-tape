/**
 * ParcelX API Service
 * Handles all communication with ParcelX's shipping API
 * Base URL: https://app.parcelx.in
 */

import { prisma } from "../config/db.js";

/**
 * Get ParcelX settings from database
 */
export async function getParcelXSettings() {
    let settings = await prisma.parcelXSettings.findFirst();

    if (!settings) {
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

    // Use accessToken field, fallback to apiKey for backward compatibility
    const token = settings.accessToken || settings.apiKey;

    if (!token) {
        throw new Error("ParcelX access token not configured");
    }

    const baseUrl = settings.baseUrl || "https://app.parcelx.in";

    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            "access-token": token,
        },
    };

    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }

    const url =
        method === "GET" && body
            ? `${baseUrl}${endpoint}?${new URLSearchParams(body)}`
            : `${baseUrl}${endpoint}`;

    //console.log(`ParcelX API Request: ${method} ${url}`);

    const response = await fetch(url, options);

    let data = {};
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    }

    //console.log(`ParcelX API Response: ${response.status}`, data);

    if (!response.ok) {
        throw new Error(
            data.message || data.error || `ParcelX API error: ${response.status}`
        );
    }

    // ParcelX returns status:false with responsemsg on business logic errors
    if (data.status === false) {
        const msg = Array.isArray(data.responsemsg)
            ? data.responsemsg.join(", ")
            : data.responsemsg || "ParcelX request failed";
        throw new Error(msg);
    }

    return data;
}

/**
 * Check courier serviceability for a pincode
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
        weight: weight * 1000, // Convert kg to grams
        payment_mode: cod ? "COD" : "Prepaid",
    };

    return parcelxRequest("/api/v3/pincode/serviceability", "POST", params);
}

/**
 * Create order in ParcelX
 */
export async function createParcelXOrder(orderData) {
    return parcelxRequest("/api/v3/order/create_order", "POST", orderData);
}

/**
 * Track shipment by Waybill/AWB code
 */
export async function trackShipment(waybill) {
    return parcelxRequest(`/api/v3/order/track_order`, "POST", { waybill });
}

/**
 * Cancel order in ParcelX
 */
export async function cancelParcelXOrder(waybill) {
    return parcelxRequest("/api/v3/order/cancel_order", "POST", {
        waybill,
    });
}

/**
 * Generate shipping label
 */
export async function generateLabel(waybill) {
    return parcelxRequest(`/api/v3/order/get_label`, "POST", { waybill });
}

/**
 * Build order payload for ParcelX from our Order
 */
export async function buildParcelXOrderPayload(order, overrides = {}) {
    const settings = await getParcelXSettings();
    const pickupAddress = await getDefaultParcelXPickupAddress();

    if (!pickupAddress) {
        throw new Error("No ParcelX pickup address configured");
    }

    if (!pickupAddress.parcelxPickupId) {
        throw new Error(
            "ParcelX Pickup Address ID not set. Please add the ParcelX pick_address_id to your pickup address in settings."
        );
    }

    const shippingAddress = order.shippingAddress;
    if (!shippingAddress) {
        throw new Error("No shipping address for order");
    }

    // Calculate total weight and dimensions
    let totalWeight = 0;
    let maxLength = settings.defaultLength;
    let maxBreadth = settings.defaultBreadth;
    let totalHeight = 0;
    const products = [];

    for (const item of order.items) {
        const variant = item.variant;

        const length = variant.shippingLength || settings.defaultLength;
        const breadth = variant.shippingBreadth || settings.defaultBreadth;
        const height = variant.shippingHeight || settings.defaultHeight;
        const weight = variant.shippingWeight || settings.defaultWeight;

        totalWeight += weight * item.quantity;
        maxLength = Math.max(maxLength, length);
        maxBreadth = Math.max(maxBreadth, breadth);
        totalHeight += height * item.quantity;

        products.push({
            product_sku: variant.sku || `SKU-${item.id}`,
            product_name: item.product.name,
            product_value: String(parseFloat(item.price)),
            product_hsnsac: "",
            product_taxper: 0,
            product_category: item.product.name,
            product_quantity: String(item.quantity),
            product_description: "",
        });
    }

    const isCOD = order.paymentMethod === "CASH";

    const payload = {
        client_order_id: order.orderNumber,
        b2b: false,
        consignee_name: shippingAddress.name || order.user?.name || "Customer",
        consignee_address1: shippingAddress.street,
        consignee_address2: shippingAddress.address2 || "",
        consignee_pincode: shippingAddress.postalCode,
        consignee_mobile: shippingAddress.phone || order.user?.phone || "",
        consignee_phone: "",
        consignee_emailid: order.user?.email || "",
        invoice_number: order.orderNumber,
        express_type: "surface",
        pick_address_id: pickupAddress.parcelxPickupId,
        return_address_id: "",
        cod_amount: isCOD ? String(parseFloat(order.total)) : "0",
        tax_amount: "0",
        mps: "0",
        courier_type: overrides.courierType !== undefined ? overrides.courierType : 1,
courier_code: overrides.courierCode !== undefined ? overrides.courierCode : "PXBDE01",
        address_type: "Home",
        payment_mode: isCOD ? "Cod" : "Prepaid",
        order_amount: String(parseFloat(order.total)),
        extra_charges: "0",
        shipment_length: [String(Math.round(overrides.length || maxLength))],
shipment_width: [String(Math.round(overrides.width || maxBreadth))],
shipment_height: [String(Math.round(overrides.height || Math.min(totalHeight, 100)))],
shipment_weight: [String(overrides.weight || totalWeight)],
        products,
    };

    return payload;
}

/**
 * Process order for ParcelX (create order)
 */
export async function processOrderForParcelX(orderId, overrides = {}) {
    const settings = await getParcelXSettings();

    if (!settings.isEnabled) {
        //console.log("ParcelX is disabled, skipping shipping integration");
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
        const payload = await buildParcelXOrderPayload(order, overrides);
        //console.log("ParcelX order payload:", JSON.stringify(payload, null, 2));  // to show the payload

        const parcelxResponse = await createParcelXOrder(payload);

        // Update order with ParcelX details
        // ParcelX response structure: { status: true, data: { waybill: "...", courier_name: "..." } }
        const waybill = parcelxResponse?.data?.waybill
            || parcelxResponse?.waybill
            || null;
        const courierName = parcelxResponse?.data?.courier_name
            || parcelxResponse?.courier_name
            || null;

        await prisma.order.update({
            where: { id: orderId },
            data: {
                parcelxWaybill: waybill,
                parcelxStatus: "MANIFESTED",
                awbCode: waybill,
                courierName: courierName,
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