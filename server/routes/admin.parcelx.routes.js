/**
 * ParcelX Admin Routes
 */

import express from "express";
import { isAdmin } from "../middlewares/auth.middleware.js";
import {
    getSettings,
    updateSettings,
    testConnection,
    getPickupAddresses,
    createPickupAddress,
    updatePickupAddress,
    deletePickupAddress,
    checkOrderServiceability,
    syncOrderToParcelX,
    getOrderTracking,
    cancelShipment,
    getShippingLabel,
    handleWebhook,
} from "../controllers/admin.parcelx.controller.js";

const router = express.Router();

// Settings routes
router.get("/settings", isAdmin, getSettings);
router.put("/settings", isAdmin, updateSettings);
router.post("/test-connection", isAdmin, testConnection);

// Pickup address routes
router.get("/pickup-addresses", isAdmin, getPickupAddresses);
router.post("/pickup-addresses", isAdmin, createPickupAddress);
router.put("/pickup-addresses/:id", isAdmin, updatePickupAddress);
router.delete("/pickup-addresses/:id", isAdmin, deletePickupAddress);

// Serviceability check
router.post("/serviceability", isAdmin, checkOrderServiceability);

// Order operations
router.post("/orders/:orderId/sync", isAdmin, syncOrderToParcelX);
router.get("/orders/:orderId/tracking", isAdmin, getOrderTracking);
router.post("/orders/:orderId/cancel", isAdmin, cancelShipment);
router.get("/orders/:orderId/label", isAdmin, getShippingLabel);

// Webhook (public)
router.post("/webhook", handleWebhook);

export default router;
