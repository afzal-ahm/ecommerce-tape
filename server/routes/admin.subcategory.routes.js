import express from "express";
import {
  getSubCategoriesByCategory,
  getSubCategoryById,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/admin.subcategory.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";
import { uploadFiles } from "../middlewares/multer.middlerware.js";

const router = express.Router();

// Get all sub-categories for a category
router.get(
  "/categories/:categoryId/sub-categories",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getSubCategoriesByCategory
);

// Get sub-category by ID
router.get(
  "/sub-categories/:id",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getSubCategoryById
);

// Create sub-category
router.post(
  "/categories/:categoryId/sub-categories",
  verifyAdminJWT,
  hasPermission("products", "create"),
  uploadFiles.single("image"),
  createSubCategory
);

// Update sub-category
router.put(
  "/sub-categories/:id",
  verifyAdminJWT,
  hasPermission("products", "update"),
  uploadFiles.single("image"),
  updateSubCategory
);

// Delete sub-category
router.delete(
  "/sub-categories/:id",
  verifyAdminJWT,
  hasPermission("products", "delete"),
  deleteSubCategory
);

export default router;








