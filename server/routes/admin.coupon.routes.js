import express from "express";
import { prisma } from "../config/db.js";
import { isAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();
// using shared `prisma` from `config/db.js`

// Get all coupons
router.get("/coupons", isAdmin, async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: [{ code: "asc" }],
      include: {
        couponPartners: {
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        // relation names on Coupon model (defined in Prisma schema)
        categories: { include: { category: true } },
        products: { include: { product: true } },
        brands: { include: { brand: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Coupons fetched successfully",
      data: { coupons },
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coupons",
      error: error.message,
    });
  }
});

// Get coupon by ID
router.get("/coupons/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        couponPartners: {
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        categories: { include: { category: true } },
        products: { include: { product: true } },
        brands: { include: { brand: true } },
      },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupon fetched successfully",
      data: { coupon },
    });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch coupon",
      error: error.message,
    });
  }
});

// Create coupon
router.post("/coupons", isAdmin, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      startDate,
      endDate,
      isActive,
      partners, // Array of {partnerId, commission}
    } = req.body;

    if (!code || !discountType || !discountValue || !startDate) {
      return res.status(400).json({
        success: false,
        message:
          "Code, discount type, discount value, and start date are required",
      });
    }

    // Validate discount value

    // Targets: optional arrays of IDs
    const { categoryIds, productIds, brandIds } = req.body;
    const discountValueNum = parseFloat(discountValue);
    if (isNaN(discountValueNum) || discountValueNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value must be a positive number",
      });
    }

    // Validate min order amount if provided
    let minOrderAmountNum = null;
    if (minOrderAmount) {
      minOrderAmountNum = parseFloat(minOrderAmount);
      if (isNaN(minOrderAmountNum) || minOrderAmountNum < 0) {
        return res.status(400).json({
          success: false,
          message: "Minimum order amount must be a non-negative number",
        });
      }
    }

    // Validate max uses if provided
    let maxUsesNum = null;
    if (maxUses) {
      maxUsesNum = parseInt(maxUses);
      if (isNaN(maxUsesNum) || maxUsesNum < 1) {
        return res.status(400).json({
          success: false,
          message: "Maximum uses must be a positive integer",
        });
      }
    }

    // Validate dates
    const startDateObj = new Date(startDate);
    let endDateObj = null;

    if (endDate) {
      endDateObj = new Date(endDate);
      if (endDateObj <= startDateObj) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date",
        });
      }
    }

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        code: { equals: code, mode: "insensitive" },
      },
    });

    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: "A coupon with this code already exists",
      });
    }

    // Validate partners if provided
    let partnersData = [];
    if (partners && Array.isArray(partners) && partners.length > 0) {
      // Check for duplicate partner IDs
      const partnerIds = partners.map(p => p.partnerId);
      const uniquePartnerIds = [...new Set(partnerIds)];
      if (partnerIds.length !== uniquePartnerIds.length) {
        return res.status(400).json({
          success: false,
          message: "Each partner can only be assigned once per coupon. Duplicate partners found.",
        });
      }

      for (const partner of partners) {
        if (!partner.partnerId) {
          return res.status(400).json({
            success: false,
            message: "Partner ID is required for all partners",
          });
        }

        // Check if partner exists
        const partnerExists = await prisma.partner.findUnique({
          where: { id: partner.partnerId },
        });

        if (!partnerExists) {
          return res.status(400).json({
            success: false,
            message: `Partner with ID ${partner.partnerId} not found`,
          });
        }

        // Validate commission
        let commission = null;
        if (partner.commission !== undefined && partner.commission !== null) {
          commission = parseFloat(partner.commission);
          if (isNaN(commission) || commission < 0 || commission > 100) {
            return res.status(400).json({
              success: false,
              message: `Commission for partner ${partnerExists.name} must be between 0 and 100`,
            });
          }
        }

        partnersData.push({
          partnerId: partner.partnerId,
          commission: commission,
        });
      }
    }

    // Create coupon with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create coupon
      const newCoupon = await tx.coupon.create({
        data: {
          code,
          description,
          discountType,
          discountValue: discountValueNum,
          minOrderAmount: minOrderAmountNum,
          maxUses: maxUsesNum,
          startDate: startDateObj,
          endDate: endDateObj,
          isActive: isActive === undefined ? true : Boolean(isActive),
          usedCount: 0,
        },
      });

      // Create targeting relations if provided
      if (Array.isArray(categoryIds) && categoryIds.length) {
        await tx.couponCategory.createMany({
          data: categoryIds.map((c) => ({ couponId: newCoupon.id, categoryId: c })),
          skipDuplicates: true,
        });
      }

      if (Array.isArray(productIds) && productIds.length) {
        await tx.couponProduct.createMany({
          data: productIds.map((p) => ({ couponId: newCoupon.id, productId: p })),
          skipDuplicates: true,
        });
      }

      if (Array.isArray(brandIds) && brandIds.length) {
        await tx.couponBrand.createMany({
          data: brandIds.map((b) => ({ couponId: newCoupon.id, brandId: b })),
          skipDuplicates: true,
        });
      }

      // Create partner relationships if any
      if (partnersData.length > 0) {
        await tx.couponPartner.createMany({
          data: partnersData.map(partner => ({
            couponId: newCoupon.id,
            partnerId: partner.partnerId,
            commission: partner.commission,
          })),
        });
      }

      // Fetch created coupon with partners
      const couponWithPartners = await tx.coupon.findUnique({
        where: { id: newCoupon.id },
        include: {
          couponPartners: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return couponWithPartners;
    });

    return res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: { coupon: result },
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create coupon",
      error: error.message,
    });
  }
});

// Update coupon
router.patch("/coupons/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      startDate,
      endDate,
      isActive,
      partners, // Array of {partnerId, commission}
    } = req.body;

    // Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        couponPartners: true,
      },
    });

    if (!existingCoupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Prepare update data
    const updateData = {};

    // Targets: optional arrays of IDs
    const { categoryIds, productIds, brandIds } = req.body;

    // Update code if provided
    if (code !== undefined) {
      // Check if another coupon with the same code exists
      const duplicateCoupon = await prisma.coupon.findFirst({
        where: {
          code: { equals: code, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicateCoupon) {
        return res.status(400).json({
          success: false,
          message: "A coupon with this code already exists",
        });
      }

      updateData.code = code;
    }

    // Update other fields
    if (description !== undefined) {
      updateData.description = description;
    }

    if (discountType !== undefined) {
      updateData.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const discountValueNum = parseFloat(discountValue);
      if (isNaN(discountValueNum) || discountValueNum <= 0) {
        return res.status(400).json({
          success: false,
          message: "Discount value must be a positive number",
        });
      }
      updateData.discountValue = discountValueNum;
    }

    if (minOrderAmount !== undefined) {
      if (minOrderAmount === null || minOrderAmount === "") {
        updateData.minOrderAmount = null;
      } else {
        const minOrderAmountNum = parseFloat(minOrderAmount);
        if (isNaN(minOrderAmountNum) || minOrderAmountNum < 0) {
          return res.status(400).json({
            success: false,
            message: "Minimum order amount must be a non-negative number",
          });
        }
        updateData.minOrderAmount = minOrderAmountNum;
      }
    }

    if (maxUses !== undefined) {
      if (maxUses === null || maxUses === "") {
        updateData.maxUses = null;
      } else {
        const maxUsesNum = parseInt(maxUses);
        if (isNaN(maxUsesNum) || maxUsesNum < 1) {
          return res.status(400).json({
            success: false,
            message: "Maximum uses must be a positive integer",
          });
        }
        updateData.maxUses = maxUsesNum;
      }
    }

    if (startDate !== undefined) {
      const startDateObj = new Date(startDate);
      updateData.startDate = startDateObj;

      if (existingCoupon.endDate) {
        const existingEndDate = new Date(existingCoupon.endDate);
        if (startDateObj >= existingEndDate) {
          return res.status(400).json({
            success: false,
            message: "Start date must be before end date",
          });
        }
      }
    }

    if (endDate !== undefined) {
      if (endDate === null || endDate === "") {
        updateData.endDate = null;
      } else {
        const endDateObj = new Date(endDate);
        const startDateToCompare =
          startDate !== undefined
            ? new Date(startDate)
            : existingCoupon.startDate;

        if (endDateObj <= startDateToCompare) {
          return res.status(400).json({
            success: false,
            message: "End date must be after start date",
          });
        }
        updateData.endDate = endDateObj;
      }
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    // Validate partners if provided
    let partnersData = [];
    if (partners !== undefined) {
      if (Array.isArray(partners) && partners.length > 0) {
        // Check for duplicate partner IDs
        const partnerIds = partners.map(p => p.partnerId);
        const uniquePartnerIds = [...new Set(partnerIds)];
        if (partnerIds.length !== uniquePartnerIds.length) {
          return res.status(400).json({
            success: false,
            message: "Each partner can only be assigned once per coupon. Duplicate partners found.",
          });
        }

        for (const partner of partners) {
          if (!partner.partnerId) {
            return res.status(400).json({
              success: false,
              message: "Partner ID is required for all partners",
            });
          }

          // Check if partner exists
          const partnerExists = await prisma.partner.findUnique({
            where: { id: partner.partnerId },
          });

          if (!partnerExists) {
            return res.status(400).json({
              success: false,
              message: `Partner with ID ${partner.partnerId} not found`,
            });
          }

          // Validate commission
          let commission = null;
          if (partner.commission !== undefined && partner.commission !== null) {
            commission = parseFloat(partner.commission);
            if (isNaN(commission) || commission < 0 || commission > 100) {
              return res.status(400).json({
                success: false,
                message: `Commission for partner ${partnerExists.name} must be between 0 and 100`,
              });
            }
          }

          partnersData.push({
            partnerId: partner.partnerId,
            commission: commission,
          });
        }
      }
    }

    // Update coupon with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update coupon
      const updatedCoupon = await tx.coupon.update({
        where: { id },
        data: updateData,
      });

      // Update targeting relations if keys provided
      if (categoryIds !== undefined) {
        await prisma.couponCategory.deleteMany({ where: { couponId: id } });
        if (Array.isArray(categoryIds) && categoryIds.length) {
          await prisma.couponCategory.createMany({
            data: categoryIds.map((c) => ({ couponId: id, categoryId: c })),
            skipDuplicates: true,
          });
        }
      }

      if (productIds !== undefined) {
        await prisma.couponProduct.deleteMany({ where: { couponId: id } });
        if (Array.isArray(productIds) && productIds.length) {
          await prisma.couponProduct.createMany({
            data: productIds.map((p) => ({ couponId: id, productId: p })),
            skipDuplicates: true,
          });
        }
      }

      if (brandIds !== undefined) {
        await prisma.couponBrand.deleteMany({ where: { couponId: id } });
        if (Array.isArray(brandIds) && brandIds.length) {
          await prisma.couponBrand.createMany({
            data: brandIds.map((b) => ({ couponId: id, brandId: b })),
            skipDuplicates: true,
          });
        }
      }

      // Update partners if provided
      if (partners !== undefined) {
        // Delete existing partner relationships
        await tx.couponPartner.deleteMany({
          where: { couponId: id },
        });

        // Create new partner relationships
        if (partnersData.length > 0) {
          await tx.couponPartner.createMany({
            data: partnersData.map(partner => ({
              couponId: id,
              partnerId: partner.partnerId,
              commission: partner.commission,
            })),
          });
        }
      }

      // Fetch updated coupon with partners
      const couponWithPartners = await tx.coupon.findUnique({
        where: { id },
        include: {
          couponPartners: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return couponWithPartners;
    });

    return res.status(200).json({
      success: true,
      message: "Coupon updated successfully",
      data: { coupon: result },
    });

  } catch (error) {
    console.error("Error updating coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update coupon",
      error: error.message,
    });
  }
});

// Delete coupon
router.delete("/coupons/:id", isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if coupon exists
    const coupon = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }

    // Delete coupon
    await prisma.coupon.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete coupon",
      error: error.message,
    });
  }
});

export default router;
