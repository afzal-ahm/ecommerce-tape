import express from "express";
import {
  getFlashSales,
  getFlashSaleById,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  toggleFlashSaleStatus,
} from "../controllers/admin.flashsale.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminJWT);

// Get all flash sales
router.get(
  "/",
  hasPermission("products", "read"),
  getFlashSales
);

// Get flash sale by ID
router.get(
  "/:flashSaleId",
  hasPermission("products", "read"),
  getFlashSaleById
);

// Create flash sale
router.post(
  "/",
  hasPermission("products", "create"),
  createFlashSale
);

// Update flash sale
router.patch(
  "/:flashSaleId",
  hasPermission("products", "update"),
  updateFlashSale
);

// Delete flash sale
router.delete(
  "/:flashSaleId",
  hasPermission("products", "delete"),
  deleteFlashSale
);

// Toggle flash sale status
router.patch(
  "/:flashSaleId/toggle-status",
  hasPermission("products", "update"),
  toggleFlashSaleStatus
);

export default router;






