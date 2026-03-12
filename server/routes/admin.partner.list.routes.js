import express from "express";
import { isAdmin } from "../middlewares/auth.middleware.js";
import { prisma } from "../config/db.js";

const router = express.Router();
// using shared `prisma` from `config/db.js`

// Test endpoint to verify routing
router.get("/test", (req, res) => {
    console.log('🟢 Test endpoint called');
    res.json({ message: "Admin route working", timestamp: new Date() });
});

// Get all approved partners (for coupon assignment dropdown)
router.get("/partners/approved", isAdmin, async (req, res) => {
    try {


        const partners = await prisma.partner.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                number: true,
                createdAt: true,
                request: {
                    select: {
                        message: true
                    }
                },
                couponPartners: {
                    include: {
                        coupon: {
                            select: {
                                id: true,
                                code: true,
                                description: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });


        // Calculate earnings for each partner
        const partnersWithEarnings = await Promise.all(
            partners.map(async (partner) => {
                // Get earnings for this partner (only from DELIVERED orders)
                const earnings = await prisma.partnerEarning.findMany({
                    where: {
                        partnerId: partner.id,
                        order: {
                            status: 'DELIVERED'
                        }
                    },
                    select: { amount: true, createdAt: true },
                });

                let totalEarnings = 0;
                let monthlyEarnings = 0;
                const currentMonth = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0');

                const monthlyBreakdown = {};
                earnings.forEach(earning => {
                    const amount = parseFloat(earning.amount);
                    totalEarnings += amount;

                    const month = earning.createdAt.getFullYear() + '-' + String(earning.createdAt.getMonth() + 1).padStart(2, '0');
                    if (!monthlyBreakdown[month]) monthlyBreakdown[month] = 0;
                    monthlyBreakdown[month] += amount;

                    if (month === currentMonth) {
                        monthlyEarnings += amount;
                    }
                });

                // Transform couponPartners to coupons array
                const coupons = partner.couponPartners?.map(cp => ({
                    id: cp.coupon.id,
                    code: cp.coupon.code,
                    description: cp.coupon.description
                })) || [];

                return {
                    id: partner.id,
                    name: partner.name,
                    email: partner.email,
                    number: partner.number,
                    status: "ACTIVE",
                    monthlyEarnings: monthlyEarnings,
                    registeredAt: partner.createdAt,
                    message: partner.request?.message || null,
                    coupons: coupons,
                    earnings: {
                        total: totalEarnings,
                        monthly: monthlyBreakdown
                    }
                };
            })
        );

        return res.status(200).json({
            success: true,
            message: "Approved partners fetched successfully",
            data: partnersWithEarnings,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch partners",
            error: error.message,
        });
    }
});

export default router;
