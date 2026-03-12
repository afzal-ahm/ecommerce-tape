import express from "express";
import {
    getGlobalMOQ,
    setGlobalMOQ,
    getProductMOQ,
    setProductMOQ,
    deleteProductMOQ,
    getVariantMOQ,
    setVariantMOQ,
    deleteVariantMOQ,
    getEffectiveMOQ,
    getAllPricingSlabs,
    getProductPricingSlabs,
    getVariantPricingSlabs,
    createPricingSlab,
    updatePricingSlab,
    deletePricingSlab,
    getEffectivePrice,
} from "../controllers/admin.moq.controller.js";
import {
    verifyAdminJWT,
    hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminJWT);

// ==================== MOQ Settings Routes ====================

// Global MOQ
router.get("/moq/global", getGlobalMOQ);
router.post("/moq/global", setGlobalMOQ);
router.put("/moq/global", setGlobalMOQ);

// Product MOQ
router.get("/moq/product/:productId", getProductMOQ);
router.post("/moq/product/:productId", setProductMOQ);
router.put("/moq/product/:productId", setProductMOQ);
router.delete("/moq/product/:productId", deleteProductMOQ);

// Variant MOQ
router.get("/moq/variant/:variantId", getVariantMOQ);
router.post("/moq/variant/:variantId", setVariantMOQ);
router.put("/moq/variant/:variantId", setVariantMOQ);
router.delete("/moq/variant/:variantId", deleteVariantMOQ);

// Effective MOQ (for frontend)
router.get("/moq/effective/:variantId", getEffectiveMOQ);

// ==================== Pricing Slabs Routes ====================

// Get All Pricing Slabs
router.get("/pricing-slabs", getAllPricingSlabs);

// Product Pricing Slabs
router.get("/pricing-slabs/product/:productId", getProductPricingSlabs);

// Variant Pricing Slabs
router.get("/pricing-slabs/variant/:variantId", getVariantPricingSlabs);

// Create Pricing Slab
router.post("/pricing-slabs", createPricingSlab);

// Update Pricing Slab
router.put("/pricing-slabs/:id", updatePricingSlab);

// Delete Pricing Slab
router.delete("/pricing-slabs/:id", deletePricingSlab);

// Get Effective Price (for frontend)
router.get("/pricing-slabs/effective/:variantId", getEffectivePrice);

export default router;

