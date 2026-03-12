import express from "express";
import {
    getPaymentGatewaySettings,
    getPaymentGatewaySetting,
    upsertPaymentGatewaySetting,
    deletePaymentGatewaySetting,
    getDecryptedPaymentKeys,
} from "../controllers/admin.payment-gateway.controller.js";
import {
    verifyAdminJWT,
    hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminJWT);

// Get all payment gateway settings for a user
router.get("/payment-gateway-settings/:userId", getPaymentGatewaySettings);

// Get specific gateway setting
router.get(
    "/payment-gateway-settings/:userId/:gateway",
    getPaymentGatewaySetting
);

// Create or Update payment gateway setting
router.post(
    "/payment-gateway-settings/:userId",
    upsertPaymentGatewaySetting
);
router.put(
    "/payment-gateway-settings/:userId",
    upsertPaymentGatewaySetting
);

// Delete payment gateway setting
router.delete(
    "/payment-gateway-settings/:userId/:gateway",
    deletePaymentGatewaySetting
);

// Internal route for getting decrypted keys (for payment processing)
// This should be called from backend only, not exposed to frontend
router.get(
    "/payment-gateway-settings/:userId/:gateway/keys",
    getDecryptedPaymentKeys
);

export default router;

