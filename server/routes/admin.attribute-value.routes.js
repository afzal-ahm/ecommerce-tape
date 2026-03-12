import express from "express";
import {
  getAttributeValuesByAttribute,
  getAttributeValueById,
  createAttributeValue,
  updateAttributeValue,
  deleteAttributeValue,
} from "../controllers/admin.attribute-value.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";
import { uploadFiles } from "../middlewares/multer.middlerware.js";

const router = express.Router();

// Get all values for an attribute
router.get(
  "/attributes/:attributeId/values",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getAttributeValuesByAttribute
);

// Get attribute value by ID
router.get(
  "/attribute-values/:id",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getAttributeValueById
);

// Create attribute value
router.post(
  "/attributes/:attributeId/values",
  verifyAdminJWT,
  hasPermission("products", "create"),
  uploadFiles.single("image"),
  createAttributeValue
);

// Update attribute value
router.put(
  "/attribute-values/:id",
  verifyAdminJWT,
  hasPermission("products", "update"),
  uploadFiles.single("image"),
  updateAttributeValue
);

// Delete attribute value
router.delete(
  "/attribute-values/:id",
  verifyAdminJWT,
  hasPermission("products", "delete"),
  deleteAttributeValue
);

export default router;
