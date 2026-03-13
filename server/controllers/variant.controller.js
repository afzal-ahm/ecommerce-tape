import { prisma } from "../config/db.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";

// @desc    Create a new variant group
// @route   POST /api/admin/variants
// @access  Private/Admin
export const createVariantGroup = asyncHandler(async (req, res) => {
    const { name, type, products } = req.body;

    if (!name || !type || !products || !Array.isArray(products) || products.length === 0) {
        throw new ApiError(400, "Name, type, and at least one product are required");
    }

    // Create the group and items in a transaction
    const variantGroup = await prisma.variantGroup.create({
        data: {
            name,
            type,
            items: {
                create: products.map((item, index) => ({
                    productId: item.productId,
                    label: item.label,
                    value: item.value, // Optional hex code or other value
                    order: item.order || index,
                    isDefault: item.isDefault || false,
                })),
            },
        },
        include: {
            items: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            images: {
                                where: { isPrimary: true },
                                take: 1
                            }
                        }
                    }
                }
            },
        },
    });

    res.status(201).json(new ApiResponsive(201, variantGroup, "Variant group created successfully"));
});

// @desc    Get variant group by ID
// @route   GET /api/admin/variants/:id
// @access  Private/Admin
export const getVariantGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const variantGroup = await prisma.variantGroup.findUnique({
        where: { id },
        include: {
            items: {
                orderBy: { order: "asc" },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            images: {
                                where: { isPrimary: true },
                                take: 1
                            }
                        },
                    },
                },
            },
        },
    });

    if (!variantGroup) {
        throw new ApiError(404, "Variant group not found");
    }

    res.status(200).json(new ApiResponsive(200, variantGroup, "Variant group fetched successfully"));
});

// @desc    Update variant group
// @route   PUT /api/admin/variants/:id
// @access  Private/Admin
export const updateVariantGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, type, products } = req.body;

    // Verify group exists
    const existingGroup = await prisma.variantGroup.findUnique({ where: { id } });
    if (!existingGroup) {
        throw new ApiError(404, "Variant group not found");
    }

    // Transaction to update group details and replace items
    const updatedGroup = await prisma.$transaction(async (prisma) => {
        // 1. Update basic info
        await prisma.variantGroup.update({
            where: { id },
            data: { name, type },
        });

        // 2. If products provided, replace all items
        if (products && Array.isArray(products)) {
            // Delete all existing items
            await prisma.variantGroupItem.deleteMany({
                where: { variantGroupId: id }
            });

            // Create new items
            // Note: Using createMany won't work if we need to set specific relations in some DBs, but for simple link table it's fine.
            // However, Prisma createMany is not supported in nested update for hasMany.
            // We can do it via 'update' with 'deleteMany' and 'create'.

            await prisma.variantGroup.update({
                where: { id },
                data: {
                    items: {
                        create: products.map((item, index) => ({
                            productId: item.productId,
                            label: item.label?.match(/\d+\s*Rolls?/i)?.[0] || item.label,
                            value: item.value,
                            order: item.order || index,
                            isDefault: item.isDefault || false,
                        }))
                    }
                }
            });
        }

        return prisma.variantGroup.findUnique({
            where: { id },
            include: {
                items: {
                    orderBy: { order: "asc" },
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                images: {
                                    where: { isPrimary: true },
                                    take: 1
                                }
                            }
                        }
                    },
                },
            },
        });
    });

    res.status(200).json(new ApiResponsive(200, updatedGroup, "Variant group updated successfully"));
});

// @desc    Delete variant group
// @route   DELETE /api/admin/variants/:id
// @access  Private/Admin
export const deleteVariantGroup = asyncHandler(async (req, res) => {
    const { id } = req.params;

    console.log("Deleting variant group with ID:", id);

    // First verify the group exists
    const existingGroup = await prisma.variantGroup.findUnique({
        where: { id },
    });

    if (!existingGroup) {
        console.log("Variant group not found:", id);
        throw new ApiError(404, "Variant group not found");
    }

    // Delete the group (cascade will delete items)
    await prisma.variantGroup.delete({
        where: { id },
    });

    console.log("Variant group deleted successfully:", id);
    res.status(200).json(new ApiResponsive(200, null, "Variant group deleted successfully"));
});

// @desc    Get all variant groups
// @route   GET /api/admin/variants
// @access  Private/Admin
export const getAllVariantGroups = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;

    // ... basic pagination logic if needed

    const groups = await prisma.variantGroup.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            _count: {
                select: { items: true }
            }
        }
    });

    res.status(200).json(new ApiResponsive(200, groups, "All variant groups fetched"));
});
