import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";

// ==================== MOQ Settings ====================

// Get Global MOQ Setting
export const getGlobalMOQ = asyncHandler(async (req, res, next) => {
    const moq = await prisma.mOQSetting.findFirst({
        where: {
            scope: "GLOBAL",
            isActive: true,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponsive(200, moq || null, "Global MOQ setting retrieved")
        );
});

// Create or Update Global MOQ Setting
export const setGlobalMOQ = asyncHandler(async (req, res, next) => {
    const { minQuantity, isActive = true } = req.body;

    if (!minQuantity || minQuantity < 1) {
        throw new ApiError(400, "Minimum quantity must be at least 1");
    }

    // Check if global MOQ exists
    const existing = await prisma.mOQSetting.findFirst({
        where: { scope: "GLOBAL" },
    });

    let moq;
    if (existing) {
        moq = await prisma.mOQSetting.update({
            where: { id: existing.id },
            data: { minQuantity, isActive },
        });
    } else {
        moq = await prisma.mOQSetting.create({
            data: {
                scope: "GLOBAL",
                minQuantity,
                isActive,
            },
        });
    }

    return res
        .status(200)
        .json(new ApiResponsive(200, moq, "Global MOQ setting updated"));
});

// Get Product MOQ Setting
export const getProductMOQ = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;

    const moq = await prisma.mOQSetting.findFirst({
        where: {
            scope: "PRODUCT",
            productId,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponsive(200, moq || null, "Product MOQ setting retrieved")
        );
});

// Create or Update Product MOQ Setting
export const setProductMOQ = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;
    const { minQuantity, isActive = true } = req.body;

    if (!minQuantity || minQuantity < 1) {
        throw new ApiError(400, "Minimum quantity must be at least 1");
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    // Check if product MOQ exists
    const existing = await prisma.mOQSetting.findFirst({
        where: {
            scope: "PRODUCT",
            productId,
        },
    });

    let moq;
    if (existing) {
        moq = await prisma.mOQSetting.update({
            where: { id: existing.id },
            data: { minQuantity, isActive },
        });
    } else {
        moq = await prisma.mOQSetting.create({
            data: {
                scope: "PRODUCT",
                productId,
                minQuantity,
                isActive,
            },
        });
    }

    return res
        .status(200)
        .json(new ApiResponsive(200, moq, "Product MOQ setting updated"));
});

// Delete Product MOQ Setting
export const deleteProductMOQ = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;

    const moq = await prisma.mOQSetting.findFirst({
        where: {
            scope: "PRODUCT",
            productId,
        },
    });

    if (moq) {
        await prisma.mOQSetting.delete({
            where: { id: moq.id },
        });
    }

    return res
        .status(200)
        .json(new ApiResponsive(200, null, "Product MOQ setting deleted"));
});

// Get Variant MOQ Setting
export const getVariantMOQ = asyncHandler(async (req, res, next) => {
    const { variantId } = req.params;

    const moq = await prisma.mOQSetting.findFirst({
        where: {
            scope: "VARIANT",
            variantId,
        },
    });

    return res
        .status(200)
        .json(
            new ApiResponsive(200, moq || null, "Variant MOQ setting retrieved")
        );
});

// Create or Update Variant MOQ Setting
export const setVariantMOQ = asyncHandler(async (req, res, next) => {
    const { variantId } = req.params;
    const { minQuantity, isActive = true } = req.body;

    if (!minQuantity || minQuantity < 1) {
        throw new ApiError(400, "Minimum quantity must be at least 1");
    }

    // Verify variant exists
    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
    });

    if (!variant) {
        throw new ApiError(404, "Variant not found");
    }

    // Check if variant MOQ exists
    const existing = await prisma.mOQSetting.findFirst({
        where: {
            scope: "VARIANT",
            variantId,
        },
    });

    let moq;
    if (existing) {
        moq = await prisma.mOQSetting.update({
            where: { id: existing.id },
            data: { minQuantity, isActive },
        });
    } else {
        moq = await prisma.mOQSetting.create({
            data: {
                scope: "VARIANT",
                variantId,
                minQuantity,
                isActive,
            },
        });
    }

    return res
        .status(200)
        .json(new ApiResponsive(200, moq, "Variant MOQ setting updated"));
});

// Delete Variant MOQ Setting
export const deleteVariantMOQ = asyncHandler(async (req, res, next) => {
    const { variantId } = req.params;

    const moq = await prisma.mOQSetting.findFirst({
        where: {
            scope: "VARIANT",
            variantId,
        },
    });

    if (moq) {
        await prisma.mOQSetting.delete({
            where: { id: moq.id },
        });
    }

    return res
        .status(200)
        .json(new ApiResponsive(200, null, "Variant MOQ setting deleted"));
});

// Get Effective MOQ for a variant (Variant > Product > Global > 1)
export const getEffectiveMOQ = asyncHandler(async (req, res, next) => {
    const { variantId } = req.params;

    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
        include: {
            product: true,
        },
    });

    if (!variant) {
        throw new ApiError(404, "Variant not found");
    }

    // Check in priority order: Variant > Product > Global
    const variantMOQ = await prisma.mOQSetting.findFirst({
        where: {
            scope: "VARIANT",
            variantId,
            isActive: true,
        },
    });

    if (variantMOQ) {
        return res.status(200).json(
            new ApiResponsive(200, {
                moq: variantMOQ.minQuantity,
                source: "VARIANT",
                setting: variantMOQ,
            }, "Effective MOQ retrieved")
        );
    }

    const productMOQ = await prisma.mOQSetting.findFirst({
        where: {
            scope: "PRODUCT",
            productId: variant.productId,
            isActive: true,
        },
    });

    if (productMOQ) {
        return res.status(200).json(
            new ApiResponsive(200, {
                moq: productMOQ.minQuantity,
                source: "PRODUCT",
                setting: productMOQ,
            }, "Effective MOQ retrieved")
        );
    }

    const globalMOQ = await prisma.mOQSetting.findFirst({
        where: {
            scope: "GLOBAL",
            isActive: true,
        },
    });

    return res.status(200).json(
        new ApiResponsive(200, {
            moq: globalMOQ?.minQuantity || 1,
            source: globalMOQ ? "GLOBAL" : "DEFAULT",
            setting: globalMOQ,
        }, "Effective MOQ retrieved")
    );
});

// ==================== Pricing Slabs ====================

// Get All Pricing Slabs (for admin listing)
export const getAllPricingSlabs = asyncHandler(async (req, res, next) => {
    const { productId, variantId } = req.query;

    const where = {};
    if (productId) where.productId = productId;
    if (variantId) where.variantId = variantId;

    const slabs = await prisma.pricingSlab.findMany({
        where,
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                },
            },
            variant: {
                select: {
                    id: true,
                    sku: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            minQty: "asc",
        },
    });

    return res
        .status(200)
        .json(new ApiResponsive(200, slabs, "Pricing slabs retrieved"));
});

// Get Pricing Slabs for Product
export const getProductPricingSlabs = asyncHandler(async (req, res, next) => {
    const { productId } = req.params;

    const slabs = await prisma.pricingSlab.findMany({
        where: {
            productId,
            variantId: null,
        },
        orderBy: {
            minQty: "asc",
        },
    });

    return res
        .status(200)
        .json(new ApiResponsive(200, slabs, "Pricing slabs retrieved"));
});

// Get Pricing Slabs for Variant
export const getVariantPricingSlabs = asyncHandler(async (req, res, next) => {
    const { variantId } = req.params;

    const slabs = await prisma.pricingSlab.findMany({
        where: {
            variantId,
        },
        orderBy: {
            minQty: "asc",
        },
    });

    return res
        .status(200)
        .json(new ApiResponsive(200, slabs, "Pricing slabs retrieved"));
});

// Create Pricing Slab
export const createPricingSlab = asyncHandler(async (req, res, next) => {
    const { productId, variantId, minQty, maxQty, price } = req.body;

    if (!minQty || minQty < 1) {
        throw new ApiError(400, "Minimum quantity must be at least 1");
    }

    if (!price || price <= 0) {
        throw new ApiError(400, "Price must be greater than 0");
    }

    if (maxQty && maxQty < minQty) {
        throw new ApiError(400, "Maximum quantity must be greater than minimum quantity");
    }

    // Validate product or variant exists
    if (productId) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new ApiError(404, "Product not found");
        }
    }

    if (variantId) {
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
        });
        if (!variant) {
            throw new ApiError(404, "Variant not found");
        }
    }

    // Check for overlapping slabs
    const existingSlabs = await prisma.pricingSlab.findMany({
        where: {
            OR: [
                { productId: productId || undefined },
                { variantId: variantId || undefined },
            ],
        },
    });

    // Validate no overlap
    for (const slab of existingSlabs) {
        if (
            (minQty >= slab.minQty && (slab.maxQty === null || minQty <= slab.maxQty)) ||
            (maxQty === null && minQty <= slab.minQty) ||
            (maxQty !== null && maxQty >= slab.minQty && (slab.maxQty === null || maxQty <= slab.maxQty))
        ) {
            throw new ApiError(400, "Pricing slab overlaps with existing slab");
        }
    }

    const slab = await prisma.pricingSlab.create({
        data: {
            productId: productId || null,
            variantId: variantId || null,
            minQty,
            maxQty: maxQty || null,
            price,
        },
    });

    return res
        .status(201)
        .json(new ApiResponsive(201, slab, "Pricing slab created"));
});

// Update Pricing Slab
export const updatePricingSlab = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    const { minQty, maxQty, price } = req.body;

    const existing = await prisma.pricingSlab.findUnique({
        where: { id },
    });

    if (!existing) {
        throw new ApiError(404, "Pricing slab not found");
    }

    if (minQty && minQty < 1) {
        throw new ApiError(400, "Minimum quantity must be at least 1");
    }

    if (price && price <= 0) {
        throw new ApiError(400, "Price must be greater than 0");
    }

    if (maxQty && maxQty < (minQty || existing.minQty)) {
        throw new ApiError(400, "Maximum quantity must be greater than minimum quantity");
    }

    const slab = await prisma.pricingSlab.update({
        where: { id },
        data: {
            minQty: minQty || existing.minQty,
            maxQty: maxQty !== undefined ? (maxQty || null) : existing.maxQty,
            price: price || existing.price,
        },
    });

    return res
        .status(200)
        .json(new ApiResponsive(200, slab, "Pricing slab updated"));
});

// Delete Pricing Slab
export const deletePricingSlab = asyncHandler(async (req, res, next) => {
    const { id } = req.params;

    const slab = await prisma.pricingSlab.findUnique({
        where: { id },
    });

    if (!slab) {
        throw new ApiError(404, "Pricing slab not found");
    }

    await prisma.pricingSlab.delete({
        where: { id },
    });

    return res
        .status(200)
        .json(new ApiResponsive(200, null, "Pricing slab deleted"));
});

// Get Effective Price for a variant and quantity
export const getEffectivePrice = asyncHandler(async (req, res, next) => {
    const { variantId } = req.params;
    const { quantity } = req.query;

    if (!quantity || quantity < 1) {
        throw new ApiError(400, "Quantity must be at least 1");
    }

    const variant = await prisma.productVariant.findUnique({
        where: { id: variantId },
    });

    if (!variant) {
        throw new ApiError(404, "Variant not found");
    }

    const qty = parseInt(quantity);

    // Check variant pricing slabs first
    const variantSlabs = await prisma.pricingSlab.findMany({
        where: {
            variantId,
        },
        orderBy: {
            minQty: "desc",
        },
    });

    for (const slab of variantSlabs) {
        if (qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)) {
            return res.status(200).json(
                new ApiResponsive(200, {
                    price: slab.price,
                    source: "VARIANT_SLAB",
                    slab,
                    originalPrice: variant.salePrice || variant.price,
                }, "Effective price retrieved")
            );
        }
    }

    // Check product pricing slabs
    const productSlabs = await prisma.pricingSlab.findMany({
        where: {
            productId: variant.productId,
            variantId: null,
        },
        orderBy: {
            minQty: "desc",
        },
    });

    for (const slab of productSlabs) {
        if (qty >= slab.minQty && (slab.maxQty === null || qty <= slab.maxQty)) {
            return res.status(200).json(
                new ApiResponsive(200, {
                    price: slab.price,
                    source: "PRODUCT_SLAB",
                    slab,
                    originalPrice: variant.salePrice || variant.price,
                }, "Effective price retrieved")
            );
        }
    }

    // Return default price
    return res.status(200).json(
        new ApiResponsive(200, {
            price: variant.salePrice || variant.price,
            source: "DEFAULT",
            originalPrice: variant.salePrice || variant.price,
        }, "Effective price retrieved")
    );
});

