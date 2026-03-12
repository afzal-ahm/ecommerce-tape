import express from "express";
import {
  getOrders,
  getOrderById,
  updateOrderStatus,
  updateTracking,
  createOrder,
  processPayment,
  getOrderStats,
  cleanupInvalidPartnerEarnings,
  deleteOrder,
} from "../controllers/admin.order.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// Order routes
router.get(
  "/orders",
  verifyAdminJWT,
  hasPermission("orders", "read"),
  getOrders
);

router.get(
  "/orders/:orderId",
  verifyAdminJWT,
  hasPermission("orders", "read"),
  getOrderById
);

router.patch(
  "/orders/:orderId/status",
  verifyAdminJWT,
  hasPermission("orders", "update"),
  updateOrderStatus
);

router.patch(
  "/orders/:orderId/tracking",
  verifyAdminJWT,
  hasPermission("orders", "update"),
  updateTracking
);

router.post(
  "/orders",
  verifyAdminJWT,
  hasPermission("orders", "create"),
  createOrder
);

router.post(
  "/orders/:orderId/process-payment",
  verifyAdminJWT,
  hasPermission("orders", "update"),
  processPayment
);

// Order statistics
router.get(
  "/orders-stats",
  verifyAdminJWT,
  hasPermission("dashboard", "read"),
  getOrderStats
);

// Cleanup invalid partner earnings (Admin only)
router.post(
  "/cleanup-partner-earnings",
  verifyAdminJWT,
  hasPermission("orders", "update"),
  cleanupInvalidPartnerEarnings
);

router.delete(
  "/orders/:orderId",
  verifyAdminJWT,
  hasPermission("orders", "delete"),
  deleteOrder
);

export default router;
