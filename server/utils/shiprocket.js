/**
 * Shiprocket API Service
 * Handles all communication with Shiprocket's shipping API
 *
 * API Documentation: https://apidocs.shiprocket.in
 * Base URL: https://apiv2.shiprocket.in
 */

import { prisma } from "../config/db.js";
import { decrypt } from "./encryption.js";

const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external";

// Token validity: 10 days (240 hours)
const TOKEN_EXPIRY_HOURS = 240;

/**
 * Get Shiprocket settings from database
 */
export async function getShiprocketSettings() {
    let settings = await prisma.shiprocketSettings.findFirst();

    if (!settings) {
        // Create default settings if none exist
        settings = await prisma.shiprocketSettings.create({
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
 * Check if token is valid or needs refresh
 */
function isTokenValid(settings) {
    if (!settings.token || !settings.tokenExpiry) {
        return false;
    }
    // Check if token expires in less than 1 hour (buffer time)
    const now = new Date();
    const expiryWithBuffer = new Date(settings.tokenExpiry);
    expiryWithBuffer.setHours(expiryWithBuffer.getHours() - 1);

    return now < expiryWithBuffer;
}

/**
 * Authenticate with Shiprocket and get token
 */
export async function authenticate() {
    const settings = await getShiprocketSettings();

    if (!settings.email || !settings.password) {
        throw new Error("Shiprocket credentials not configured");
    }

    // Check if existing token is still valid
    if (isTokenValid(settings)) {
        return settings.token;
    }

    try {
        // Decrypt password before using
        const decryptedPassword = settings.password.startsWith("enc:")
            ? decrypt(settings.password.replace("enc:", ""))
            : settings.password;

        const response = await fetch(`${SHIPROCKET_BASE_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: settings.email,
                password: decryptedPassword,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Authentication failed");
        }

        // Calculate token expiry
        const tokenExpiry = new Date();
        tokenExpiry.setHours(tokenExpiry.getHours() + TOKEN_EXPIRY_HOURS);

        // Update token in database
        await prisma.shiprocketSettings.update({
            where: { id: settings.id },
            data: {
                token: data.token,
                tokenExpiry: tokenExpiry,
            },
        });

        return data.token;
    } catch (error) {
        console.error("Shiprocket authentication error:", error);
        throw error;
    }
}

/**
 * Make authenticated request to Shiprocket API
 */
async function shiprocketRequest(endpoint, method = "GET", body = null) {
    const token = await authenticate();

    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    };

    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }

    const url =
        method === "GET" && body
            ? `${SHIPROCKET_BASE_URL}${endpoint}?${new URLSearchParams(body)}`
            : `${SHIPROCKET_BASE_URL}${endpoint}`;

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `Shiprocket API error: ${response.status}`);
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
        pickup_postcode: pickupPincode,
        delivery_postcode: deliveryPincode,
        weight: weight,
        cod: cod ? 1 : 0,
    };

    return shiprocketRequest("/courier/serviceability/", "GET", params);
}

/**
 * Create order in Shiprocket
 */
export async function createShiprocketOrder(orderData) {
    return shiprocketRequest("/orders/create/adhoc", "POST", orderData);
}

/**
 * Assign AWB (Air Waybill) to shipment
 */
export async function assignAWB(shipmentId, courierId = null) {
    const body = {
        shipment_id: shipmentId,
    };

    if (courierId) {
        body.courier_id = courierId;
    }

    return shiprocketRequest("/courier/assign/awb", "POST", body);
}

/**
 * Schedule pickup for shipment
 */
export async function schedulePickup(shipmentId) {
    return shiprocketRequest("/courier/generate/pickup", "POST", {
        shipment_id: [shipmentId],
    });
}

/**
 * Generate shipping label
 */
export async function generateLabel(shipmentId) {
    return shiprocketRequest("/courier/generate/label", "POST", {
        shipment_id: [shipmentId],
    });
}

/**
 * Generate manifest
 */
export async function generateManifest(shipmentId) {
    return shiprocketRequest("/manifests/generate", "POST", {
        shipment_id: [shipmentId],
    });
}

/**
 * Print manifest (get PDF URL)
 */
export async function printManifest(orderId) {
    return shiprocketRequest("/manifests/print", "POST", {
        order_ids: [orderId],
    });
}

/**
 * Print invoice (get PDF URL)
 */
export async function printInvoice(orderId) {
    return shiprocketRequest("/orders/print/invoice", "POST", {
        ids: [orderId],
    });
}

/**
 * Track shipment by AWB code
 */
export async function trackShipment(awbCode) {
    return shiprocketRequest(`/courier/track/awb/${awbCode}`, "GET");
}

/**
 * Track shipment by Shiprocket order ID
 */
export async function trackByOrderId(shiprocketOrderId) {
    return shiprocketRequest(`/courier/track?order_id=${shiprocketOrderId}`, "GET");
}

/**
 * Cancel order in Shiprocket
 */
export async function cancelShiprocketOrder(shiprocketOrderId) {
    return shiprocketRequest("/orders/cancel", "POST", {
        ids: [shiprocketOrderId],
    });
}

/**
 * Create return order in Shiprocket
 * This initiates a reverse pickup for the return
 */
export async function createShiprocketReturnOrder(returnData) {
    return shiprocketRequest("/orders/create/return", "POST", returnData);
}

/**
 * Process return for Shiprocket order
 * Creates a return order in Shiprocket for reverse pickup
 */
export async function processShiprocketReturn(orderId, returnReason = "Customer Return") {
    const settings = await getShiprocketSettings();

    if (!settings.isEnabled) {
        console.log("Shiprocket is disabled, skipping return processing");
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

    if (!order || !order.shiprocketOrderId) {
        console.log("Order not found or no Shiprocket order ID");
        return null;
    }

    try {
        const pickupAddress = await getDefaultPickupAddress();
        if (!pickupAddress) {
            throw new Error("No pickup address configured");
        }

        // Build return order payload
        const returnPayload = {
            order_id: order.shiprocketOrderId,
            order_date: new Date(order.createdAt).toISOString().split('T')[0],
            pickup_customer_name: order.shippingAddress.name || order.user.name,
            pickup_last_name: "",
            company_name: "",
            pickup_address: order.shippingAddress.address1 || order.shippingAddress.street,
            pickup_address_2: order.shippingAddress.address2 || "",
            pickup_city: order.shippingAddress.city,
            pickup_state: order.shippingAddress.state,
            pickup_country: order.shippingAddress.country || "India",
            pickup_pincode: order.shippingAddress.pincode,
            pickup_email: order.user.email,
            pickup_phone: order.shippingAddress.phone || order.user.phone,
            pickup_isd_code: "91",
            shipping_customer_name: pickupAddress.name,
            shipping_last_name: "",
            shipping_address: pickupAddress.address,
            shipping_address_2: pickupAddress.address2 || "",
            shipping_city: pickupAddress.city,
            shipping_state: pickupAddress.state,
            shipping_country: pickupAddress.country || "India",
            shipping_pincode: pickupAddress.pincode,
            shipping_email: pickupAddress.email,
            shipping_phone: pickupAddress.phone,
            shipping_isd_code: "91",
            order_items: order.items.map(item => ({
                name: item.product.name,
                sku: item.variant?.sku || item.product.sku || `SKU-${item.id.slice(-8)}`,
                units: item.quantity,
                selling_price: parseFloat(item.price),
                discount: 0,
                qc_enable: false,
            })),
            payment_method: "PREPAID",
            total_discount: 0,
            sub_total: parseFloat(order.subTotal),
            length: settings.defaultLength || 10,
            breadth: settings.defaultBreadth || 10,
            height: settings.defaultHeight || 10,
            weight: settings.defaultWeight || 0.5,
        };

        const response = await createShiprocketReturnOrder(returnPayload);

        // Update order with return info
        await prisma.order.update({
            where: { id: orderId },
            data: {
                shiprocketStatus: "RETURN_INITIATED",
                shiprocketReturnId: response.order_id?.toString() || null,
            },
        });

        console.log(`Shiprocket return created for order ${order.orderNumber}`);
        return response;
    } catch (error) {
        console.error("Failed to create Shiprocket return:", error.message);
        // Update status even if API fails
        await prisma.order.update({
            where: { id: orderId },
            data: { shiprocketStatus: "RETURN_APPROVED" },
        });
        return null;
    }
}

/**
 * Get pickup locations
 */
export async function getPickupLocations() {
    return shiprocketRequest("/settings/company/pickup", "GET");
}

/**
 * Add pickup location
 */
export async function addPickupLocation(locationData) {
    return shiprocketRequest("/settings/company/addpickup", "POST", locationData);
}

/**
 * Get default pickup address from database
 */
export async function getDefaultPickupAddress() {
    return prisma.shiprocketPickupAddress.findFirst({
        where: { isDefault: true },
    });
}

/**
 * Ensure pickup address is synced to Shiprocket
 */
async function ensurePickupAddressSynced(pickupAddress) {
    // If already synced, return immediately
    if (pickupAddress.shiprocketPickupId) {
        return pickupAddress;
    }

    // If no shiprocketPickupId but has nickname, assume it's already in Shiprocket
    // This avoids the "already exists" error from repeated sync attempts
    if (pickupAddress.nickname) {
        console.log(`Using existing pickup location: ${pickupAddress.nickname}`);
        return pickupAddress;
    }

    // Only try to sync if we have no pickup ID and no nickname
    try {
        const locationData = {
            pickup_location: pickupAddress.nickname || pickupAddress.name,
            name: pickupAddress.name,
            email: pickupAddress.email,
            phone: pickupAddress.phone,
            address: pickupAddress.address,
            address_2: pickupAddress.address2 || "",
            city: pickupAddress.city,
            state: pickupAddress.state,
            country: pickupAddress.country || "India",
            pin_code: pickupAddress.pincode,
        };

        const response = await addPickupLocation(locationData);

        const pickupId = response.pickup_location_id ||
            response.data?.pickup_location_id ||
            response.id ||
            response.data?.id;

        if (pickupId) {
            await prisma.shiprocketPickupAddress.update({
                where: { id: pickupAddress.id },
                data: { shiprocketPickupId: parseInt(pickupId) },
            });
            pickupAddress.shiprocketPickupId = parseInt(pickupId);
            console.log(`Pickup address synced to Shiprocket with ID: ${pickupId}`);
        }
    } catch (error) {
        // Silently continue - the nickname should work if registered in Shiprocket
        console.log(`Pickup sync skipped: Using nickname "${pickupAddress.nickname}" directly`);
    }

    return pickupAddress;
}

/**
 * Build order payload for Shiprocket from our Order
 */
export async function buildShiprocketOrderPayload(order) {
    const settings = await getShiprocketSettings();
    const pickupAddress = await getDefaultPickupAddress();

    if (!pickupAddress) {
        throw new Error("No pickup address configured");
    }

    // Ensure pickup address is synced to Shiprocket
    const syncedPickupAddress = await ensurePickupAddressSynced(pickupAddress);

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
            units: item.quantity,
            selling_price: parseFloat(item.price),
            discount: 0,
            tax: 0,
            hsn: "", // HSN code - can be added later
        });
    }

    // Helper to split name
    const splitName = (fullName) => {
        if (!fullName) return { first: "Customer", last: "Name" };
        const parts = fullName.trim().split(" ");
        if (parts.length === 1) return { first: parts[0], last: "Customer" }; // Default last name
        const first = parts.slice(0, -1).join(" ");
        const last = parts[parts.length - 1];
        return { first, last };
    };

    // Helper to clean phone number (10 digits)
    const cleanPhone = (phone) => {
        if (!phone) return "";
        const digits = phone.replace(/\D/g, "");
        if (digits.length > 10) return digits.slice(-10); // Take last 10 digits
        return digits;
    };

    const billingName = splitName(shippingAddress.name || order.user.name);
    const cleanedPhone = cleanPhone(shippingAddress.phone || order.user.phone || "");

    // Build the payload
    // Helper to format date as YYYY-MM-DD HH:mm
    const formatDate = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    // Build the payload
    const payload = {
        order_id: order.orderNumber,
        order_date: formatDate(order.createdAt),
        pickup_location: syncedPickupAddress.nickname,
        comment: order.notes || "",

        // Billing details
        billing_customer_name: billingName.first,
        billing_last_name: billingName.last,
        billing_address: shippingAddress.street,
        billing_city: shippingAddress.city,
        billing_pincode: shippingAddress.postalCode,
        billing_state: shippingAddress.state,
        billing_country: shippingAddress.country || "India",
        billing_email: order.user.email,
        billing_phone: cleanedPhone,

        // Shipping details
        shipping_is_billing: false,
        shipping_customer_name: billingName.first,
        shipping_last_name: billingName.last,
        shipping_address: shippingAddress.street,
        shipping_city: shippingAddress.city,
        shipping_pincode: shippingAddress.postalCode,
        shipping_country: shippingAddress.country || "India",
        shipping_state: shippingAddress.state,
        shipping_email: order.user.email,
        shipping_phone: cleanedPhone,

        // Order items
        order_items: orderItems,

        // Payment
        payment_method: order.paymentMethod === "CASH" ? "COD" : "Prepaid",
        // Include shipping cost in sub_total for Shiprocket
        // Shiprocket calculates: sub_total - total_discount = final amount
        // So we need: (subTotal + shipping) - discount = total
        sub_total: parseFloat(order.subTotal) + parseFloat(order.shippingCost || 0),
        total_discount: parseFloat(order.discount) || 0,

        // Dimensions
        length: maxLength,
        breadth: maxBreadth,
        height: Math.min(totalHeight, 100),
        weight: totalWeight,
    };

    // Add optional fields
    if (shippingAddress.address2) {
        payload.billing_address_2 = shippingAddress.address2;
        payload.shipping_address_2 = shippingAddress.address2;
    }

    // Recursively remove empty strings and nulls
    const cleanPayload = (obj) => {
        Object.keys(obj).forEach(key => {
            if (obj[key] && typeof obj[key] === 'object') {
                cleanPayload(obj[key]);
            } else if (
                obj[key] === null ||
                obj[key] === undefined ||
                (typeof obj[key] === 'string' && obj[key].trim() === "")
            ) {
                delete obj[key];
            }
        });
        return obj;
    };

    cleanPayload(payload);

    return payload;
}

/**
 * Process order for Shiprocket (create order + assign AWB)
 */
export async function processOrderForShipping(orderId) {
    // Check if Shiprocket is enabled FIRST before doing anything
    const settings = await getShiprocketSettings();

    if (!settings.isEnabled) {
        console.log("Shiprocket is disabled, skipping shipping integration");
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
        // Build and send order to Shiprocket
        const payload = await buildShiprocketOrderPayload(order);
        const shiprocketResponse = await createShiprocketOrder(payload);

        // Update order with Shiprocket details
        await prisma.order.update({
            where: { id: orderId },
            data: {
                shiprocketOrderId: shiprocketResponse.order_id,
                shiprocketShipmentId: shiprocketResponse.shipment_id,
                shiprocketStatus: "CREATED",
            },
        });

        // Try to assign AWB
        try {
            const awbResponse = await assignAWB(shiprocketResponse.shipment_id);

            await prisma.order.update({
                where: { id: orderId },
                data: {
                    awbCode: awbResponse.response?.data?.awb_code || null,
                    courierName: awbResponse.response?.data?.courier_name || null,
                    shiprocketStatus: "AWB_ASSIGNED",
                },
            });

            // Try to schedule pickup
            try {
                await schedulePickup(shiprocketResponse.shipment_id);
                await prisma.order.update({
                    where: { id: orderId },
                    data: {
                        shiprocketStatus: "PICKUP_SCHEDULED",
                    },
                });
            } catch (pickupError) {
                console.error("Failed to schedule pickup:", pickupError);
                // Non-critical, continue
            }
        } catch (awbError) {
            console.error("Failed to assign AWB:", awbError);
            // Non-critical, admin can retry later
        }

        return shiprocketResponse;
    } catch (error) {
        console.error("Failed to process order for Shiprocket:", error);
        throw error;
    }
}
