import express from "express";
import {
  getAllProductSections,
  getProductSectionById,
  createProductSection,
  updateProductSection,
  deleteProductSection,
  addProductToSection,
  removeProductFromSection,
  updateProductOrderInSection,
} from "../controllers/admin.product-section.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// Get all product sections
router.get(
  "/product-sections",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getAllProductSections
);

// Get product section by ID
router.get(
  "/product-sections/:id",
  verifyAdminJWT,
  hasPermission("products", "read"),
  getProductSectionById
);

// Create product section
router.post(
  "/product-sections",
  verifyAdminJWT,
  hasPermission("products", "create"),
  createProductSection
);

// Update product section
router.put(
  "/product-sections/:id",
  verifyAdminJWT,
  hasPermission("products", "update"),
  updateProductSection
);

// Delete product section
router.delete(
  "/product-sections/:id",
  verifyAdminJWT,
  hasPermission("products", "delete"),
  deleteProductSection
);

// Add product to section
router.post(
  "/product-sections/:sectionId/products",
  verifyAdminJWT,
  hasPermission("products", "update"),
  addProductToSection
);

// Remove product from section
router.delete(
  "/product-sections/:sectionId/products/:productId",
  verifyAdminJWT,
  hasPermission("products", "update"),
  removeProductFromSection
);

// Update product order in section
router.put(
  "/product-sections/:sectionId/products/order",
  verifyAdminJWT,
  hasPermission("products", "update"),
  updateProductOrderInSection
);

export default router;








