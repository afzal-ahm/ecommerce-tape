import express from "express";
import {
  createBrand,
  updateBrand,
  deleteBrand,
  getAllBrands,
  getBrandById,
  removeProductFromBrand,
} from "../controllers/admin.brand.controller.js";
import {
  hasPermission,
  verifyAdminJWT,
} from "../middlewares/admin.middleware.js";
import { uploadFiles } from "../middlewares/multer.middlerware.js";

const router = express.Router();

// Create Brand
router.post(
  "/brands",
  verifyAdminJWT,
  hasPermission("brands", "create"),
  uploadFiles.single("image"),
  createBrand
);

// Update Brand
router.patch(
  "/brands/:brandId",
  verifyAdminJWT,
  hasPermission("brands", "update"),
  uploadFiles.single("image"),
  updateBrand
);

// Delete Brand
router.delete(
  "/brands/:brandId",
  verifyAdminJWT,
  hasPermission("brands", "delete"),
  deleteBrand
);

// Remove a product from a brand
router.delete(
  "/brands/:brandId/products/:productId",
  verifyAdminJWT,
  hasPermission("brands", "update"),
  removeProductFromBrand
);

// Get All Brands
router.get(
  "/brands",
  verifyAdminJWT,
  hasPermission("brands", "read"),
  getAllBrands
);

// Get Brand By Id
router.get(
  "/brands/:brandId",
  verifyAdminJWT,
  hasPermission("brands", "read"),
  getBrandById
);

export default router;
