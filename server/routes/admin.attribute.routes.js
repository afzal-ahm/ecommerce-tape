import express from "express";
import {
  getAllAttributes,
  getAttributeById,
  createAttribute,
  updateAttribute,
  deleteAttribute,
} from "../controllers/admin.attribute.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// Get all attributes
router.get(
  "/attributes",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getAllAttributes
);

// Get attribute by ID
router.get(
  "/attributes/:id",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getAttributeById
);

// Create attribute
router.post(
  "/attributes",
  verifyAdminJWT,
  hasPermission("products", "create"),
  createAttribute
);

// Update attribute
router.put(
  "/attributes/:id",
  verifyAdminJWT,
  hasPermission("products", "update"),
  updateAttribute
);

// Delete attribute
router.delete(
  "/attributes/:id",
  verifyAdminJWT,
  hasPermission("products", "delete"),
  deleteAttribute
);

export default router;
