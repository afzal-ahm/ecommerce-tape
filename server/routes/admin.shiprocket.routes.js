/**
 * Shiprocket Admin Routes
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
    syncOrderToShiprocket,
    getOrderTracking,
    cancelShipment,
    getShippingLabel,
    getOrderInvoice,
    handleWebhook,
} from "../controllers/admin.shiprocket.controller.js";

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
router.post("/orders/:orderId/sync", isAdmin, syncOrderToShiprocket);
router.get("/orders/:orderId/tracking", isAdmin, getOrderTracking);
router.post("/orders/:orderId/cancel", isAdmin, cancelShipment);
router.get("/orders/:orderId/label", isAdmin, getShippingLabel);
router.get("/orders/:orderId/invoice", isAdmin, getOrderInvoice);

// Webhook (public - no auth, but with security token check in controller)
router.post("/webhook", handleWebhook);

export default router;
