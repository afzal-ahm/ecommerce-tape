import express from "express";
import {
  getReturnSettings,
  updateReturnSettings,
  getAllReturnRequests,
  getReturnRequestById,
  updateReturnRequestStatus,
  getReturnStats,
} from "../controllers/admin.return.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminJWT);

// Return Settings
router.get(
  "/settings",
  hasPermission("settings", "read"),
  getReturnSettings
);
router.patch(
  "/settings",
  hasPermission("settings", "update"),
  updateReturnSettings
);

// Return Requests
router.get(
  "/",
  hasPermission("orders", "read"),
  getAllReturnRequests
);
router.get(
  "/stats",
  hasPermission("orders", "read"),
  getReturnStats
);
router.get(
  "/:returnId",
  hasPermission("orders", "read"),
  getReturnRequestById
);
router.patch(
  "/:returnId",
  hasPermission("orders", "update"),
  updateReturnRequestStatus
);

export default router;






