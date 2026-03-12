
import bcrypt from 'bcryptjs';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponsive } from '../utils/ApiResponsive.js';
import { prisma } from '../config/db.js';


// List all partner requests
export const listPartnerRequests = asyncHandler(async (req, res) => {
    const requests = await prisma.partnerRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: { partner: true },
    });
    // Remove password from partner in each request
    const safeRequests = requests.map(r => ({
        ...r,
        partner: r.partner ? (({ password, ...rest }) => rest)(r.partner) : undefined
    }));
    res.status(200).json(new ApiResponsive(200, { requests: safeRequests }, 'Partner requests fetched'));
});

// Approve partner request and set password
export const approvePartnerRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;

    const request = await prisma.partnerRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'PENDING') {
        return res.status(404).json(new ApiResponsive(404, null, 'Request not found or already processed'));
    }

    // Set demo password automatically (stronger)
    const demoPassword = 'PartnerPortal@123';
    const hashed = await bcrypt.hash(demoPassword, 10);

    const partner = await prisma.partner.create({
        data: {
            name: request.name,
            email: request.email,
            password: hashed,
            number: request.number,
            city: request.city,
            state: request.state,
            isActive: true,
            isPasswordChanged: false,
            request: { connect: { id: request.id } },
        },
    });

    // Update request
    await prisma.partnerRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED', partnerId: partner.id },
    });

    res.status(200).json(new ApiResponsive(200, {
        partner,
        demoPassword: demoPassword
    }, 'Partner approved with demo password'));
});


// Reject partner request
export const rejectPartnerRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const request = await prisma.partnerRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'PENDING') {
        return res.status(404).json(new ApiResponsive(404, null, 'Request not found or already processed'));
    }
    await prisma.partnerRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
    });
    res.status(200).json(new ApiResponsive(200, null, 'Partner request rejected'));
});

// Get full partner details (admin only)
export const getPartnerDetails = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;

    const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: {
            couponPartners: {
                include: {
                    coupon: true
                }
            },
            earnings: true,
        },
    });
    if (!partner) return res.status(404).json(new ApiResponsive(404, null, 'Partner not found'));

    // Earnings summary (only from DELIVERED orders)
    const earnings = await prisma.partnerEarning.findMany({
        where: {
            partnerId,
            order: {
                status: 'DELIVERED' // Only include earnings from delivered orders
            }
        },
        select: { amount: true, createdAt: true },
    });
    let totalEarnings = 0;
    const monthlyEarnings = {};
    earnings.forEach(e => {
        totalEarnings += parseFloat(e.amount);
        const month = e.createdAt.getFullYear() + '-' + String(e.createdAt.getMonth() + 1).padStart(2, '0');
        if (!monthlyEarnings[month]) monthlyEarnings[month] = 0;
        monthlyEarnings[month] += parseFloat(e.amount);
    });

    // Return password for admin only (this endpoint is admin-protected)
    // Remove password from partner object and transform couponPartners to coupons
    const { password, couponPartners, ...partnerSafe } = partner;

    // Transform couponPartners to simpler coupons array for frontend compatibility
    const coupons = couponPartners?.map(cp => ({
        ...cp.coupon,
        commission: cp.commission
    })) || [];

    res.status(200).json(new ApiResponsive(200, {
        partner: partnerSafe,
        coupons: coupons,
        earnings: {
            total: totalEarnings,
            monthly: monthlyEarnings,
        },
    }, 'Partner details fetched'));
});

// Manual commission creation for testing (admin only)
export const createManualCommission = asyncHandler(async (req, res) => {
    const { partnerId, orderId, couponId, amount, percentage } = req.body;

    if (!partnerId || !orderId || !couponId || !amount || !percentage) {
        return res.status(400).json(new ApiResponsive(400, null, 'All fields required'));
    }

    // Verify partner exists
    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
        return res.status(404).json(new ApiResponsive(404, null, 'Partner not found'));
    }

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
        return res.status(404).json(new ApiResponsive(404, null, 'Order not found'));
    }

    // Create commission
    const commission = await prisma.partnerEarning.create({
        data: {
            partnerId,
            orderId,
            couponId,
            amount: parseFloat(amount).toFixed(2),
            percentage: parseFloat(percentage),
        },
    });

    res.status(201).json(new ApiResponsive(201, { commission }, 'Manual commission created'));
});

// Create commissions for existing orders with coupons (one-time fix)
export const createCommissionsForExistingOrders = asyncHandler(async (req, res) => {
    try {
        // Find all orders with coupons that don't have commissions yet
        const ordersWithCoupons = await prisma.order.findMany({
            where: {
                couponId: { not: null },
                partnerEarnings: { none: {} } // Orders without any commissions
            },
            include: {
                coupon: {
                    include: {
                        couponPartners: {
                            include: { partner: true }
                        }
                    }
                }
            }
        });


        let commissionsCreated = 0;

        for (const order of ordersWithCoupons) {
            if (order.coupon && order.coupon.couponPartners.length > 0) {
                // Calculate final order amount (subtotal - discount)
                const finalOrderAmount = parseFloat(order.subTotal) - parseFloat(order.discount);

                if (finalOrderAmount > 0) {
                    for (const couponPartner of order.coupon.couponPartners) {
                        if (couponPartner.commission && couponPartner.commission > 0) {
                            // Calculate commission based on FINAL ORDER AMOUNT (not discount)
                            const commissionAmount = (finalOrderAmount * couponPartner.commission) / 100;

                            await prisma.partnerEarning.create({
                                data: {
                                    partnerId: couponPartner.partnerId,
                                    orderId: order.id,
                                    couponId: order.couponId,
                                    amount: commissionAmount.toFixed(2),
                                    percentage: couponPartner.commission,
                                },
                            });

                            commissionsCreated++;
                            console.log(`Created commission for partner ${couponPartner.partner.name} on order ${order.orderNumber}: ₹${commissionAmount.toFixed(2)} (${couponPartner.commission}% of final order ₹${finalOrderAmount.toFixed(2)})`);
                        }
                    }
                }
            }
        }

        res.status(200).json(new ApiResponsive(200,
            {
                ordersProcessed: ordersWithCoupons.length,
                commissionsCreated
            },
            `Created ${commissionsCreated} commissions for ${ordersWithCoupons.length} existing orders`
        ));
    } catch (error) {
        console.error('Error creating commissions for existing orders:', error);
        res.status(500).json(new ApiResponsive(500, null, 'Error creating commissions'));
    }
});

// Remove a coupon from a partner (admin only)
export const removePartnerCoupon = asyncHandler(async (req, res) => {
    const { partnerId, couponId } = req.params;
    // Set coupon.partnerId to null
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon || coupon.partnerId !== partnerId) {
        return res.status(404).json(new ApiResponsive(404, null, 'Coupon not assigned to this partner'));
    }
    await prisma.coupon.update({ where: { id: couponId }, data: { partnerId: null } });
    res.status(200).json(new ApiResponsive(200, null, 'Coupon removed from partner'));
});

// Deactivate partner (admin only)
export const deactivatePartner = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;

    const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) {
        return res.status(404).json(new ApiResponsive(404, null, 'Partner not found'));
    }

    // Deactivate the partner
    await prisma.partner.update({
        where: { id: partnerId },
        data: { isActive: false }
    });

    res.status(200).json(new ApiResponsive(200, null, 'Partner deactivated successfully'));
});

// Get partner details by ID with earnings (admin only)
export const getPartnerById = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;

    const partner = await prisma.partner.findUnique({
        where: { id: partnerId },
        include: {
            earnings: {
                include: {
                    order: {
                        select: {
                            orderNumber: true,
                            total: true,
                            createdAt: true,
                            user: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    coupon: {
                        select: {
                            code: true,
                            description: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            },
            monthlyEarnings: {
                orderBy: [
                    { year: 'desc' },
                    { month: 'desc' }
                ]
            },
            couponPartners: {
                include: {
                    coupon: {
                        select: {
                            id: true,
                            code: true,
                            description: true,
                            discountType: true,
                            discountValue: true,
                            minOrderAmount: true,
                            maxUses: true,
                            usedCount: true,
                            isActive: true,
                            startDate: true,
                            endDate: true,
                            isDiscountCapped: true,
                            createdAt: true
                        }
                    }
                }
            },
            request: {
                select: {
                    message: true,
                    createdAt: true
                }
            }
        }
    });

    if (!partner) {
        return res.status(404).json(new ApiResponsive(404, null, 'Partner not found'));
    }

    // Calculate earnings summary
    const totalEarnings = partner.earnings.reduce((sum, earning) => sum + parseFloat(earning.amount), 0);
    const totalOrders = partner.earnings.length;
    const pendingAmount = partner.monthlyEarnings
        .filter(monthly => monthly.paymentStatus === 'PENDING')
        .reduce((sum, monthly) => sum + parseFloat(monthly.totalAmount), 0);
    const paidAmount = partner.monthlyEarnings
        .filter(monthly => monthly.paymentStatus === 'PAID')
        .reduce((sum, monthly) => sum + parseFloat(monthly.totalAmount), 0);

    // If no monthly earnings exist, create them from individual earnings
    if (partner.monthlyEarnings.length === 0 && partner.earnings.length > 0) {
        const monthlyGroups = {};
        partner.earnings.forEach(earning => {
            const date = new Date(earning.createdAt);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const key = `${year}-${month}`;

            if (!monthlyGroups[key]) {
                monthlyGroups[key] = {
                    year,
                    month,
                    totalAmount: 0,
                    totalOrders: 0,
                    paymentStatus: 'PENDING'
                };
            }

            monthlyGroups[key].totalAmount += parseFloat(earning.amount);
            monthlyGroups[key].totalOrders += 1;
        });

        // Create monthly earnings in database
        for (const monthlyData of Object.values(monthlyGroups)) {
            await prisma.partnerMonthlyEarning.upsert({
                where: {
                    partnerId_year_month: {
                        partnerId,
                        year: monthlyData.year,
                        month: monthlyData.month
                    }
                },
                update: {
                    totalAmount: monthlyData.totalAmount,
                    totalOrders: monthlyData.totalOrders
                },
                create: {
                    partnerId,
                    year: monthlyData.year,
                    month: monthlyData.month,
                    totalAmount: monthlyData.totalAmount,
                    totalOrders: monthlyData.totalOrders,
                    paymentStatus: monthlyData.paymentStatus
                }
            });
        }

        // Fetch the newly created monthly earnings
        partner.monthlyEarnings = await prisma.partnerMonthlyEarning.findMany({
            where: { partnerId },
            orderBy: [
                { year: 'desc' },
                { month: 'desc' }
            ]
        });
    }

    // Remove password from response and transform couponPartners to simple coupons array
    const { password, couponPartners, ...partnerData } = partner;

    // Transform couponPartners to coupons with commission info
    const coupons = couponPartners?.map(cp => ({
        ...cp.coupon,
        commission: cp.commission,
        assignedAt: cp.createdAt
    })) || [];

    res.status(200).json(new ApiResponsive(200, {
        ...partnerData,
        coupons, // Add coupons data
        totalEarnings,
        pendingAmount,
        paidAmount,
        totalOrders,
        registeredAt: partner.createdAt
    }, 'Partner details fetched successfully'));
});

// Mark monthly payment as paid (admin only)
export const markPaymentAsPaid = asyncHandler(async (req, res) => {
    const { earningId } = req.params;
    const { notes, year, month } = req.body;
    const adminId = req.admin.id;

    try {
        // Check if this is a temporary ID (temp-YYYY-M format)
        if (earningId.startsWith('temp-')) {
            // Extract partnerId from the temp ID or get it from the request
            const parts = earningId.split('-'); // temp-year-month
            const earningYear = parseInt(parts[1]);
            const earningMonth = parseInt(parts[2]);

            // Find the partner associated with this earning
            const partnerEarnings = await prisma.partnerEarning.findMany({
                where: {
                    AND: [
                        {
                            createdAt: {
                                gte: new Date(earningYear, earningMonth - 1, 1),
                                lt: new Date(earningYear, earningMonth, 1)
                            }
                        }
                    ]
                },
                include: { partner: true }
            });

            if (partnerEarnings.length === 0) {
                return res.status(404).json(new ApiResponsive(404, null, 'No earnings found for this period'));
            }

            const partnerId = partnerEarnings[0].partnerId;
            const totalAmount = partnerEarnings
                .filter(e => e.partnerId === partnerId)
                .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const totalOrders = partnerEarnings.filter(e => e.partnerId === partnerId).length;

            // Create or update monthly earning record
            const updatedEarning = await prisma.partnerMonthlyEarning.upsert({
                where: {
                    partnerId_year_month: {
                        partnerId: partnerId,
                        year: earningYear,
                        month: earningMonth
                    }
                },
                update: {
                    paymentStatus: 'PAID',
                    paidBy: adminId,
                    paidAt: new Date(),
                    notes: notes || ''
                },
                create: {
                    partnerId: partnerId,
                    year: earningYear,
                    month: earningMonth,
                    totalAmount: totalAmount,
                    totalOrders: totalOrders,
                    paymentStatus: 'PAID',
                    paidBy: adminId,
                    paidAt: new Date(),
                    notes: notes || ''
                }
            });

            console.log(`Admin ${adminId} marked payment as paid for earning ${earningId}`, {
                year, month, notes
            });

            res.status(200).json(new ApiResponsive(200, updatedEarning, 'Payment marked as paid successfully'));
        } else {
            // Handle regular UUID-based earning IDs
            const updatedEarning = await prisma.partnerMonthlyEarning.update({
                where: { id: earningId },
                data: {
                    paymentStatus: 'PAID',
                    paidBy: adminId,
                    paidAt: new Date(),
                    notes: notes || ''
                }
            });

            console.log(`Admin ${adminId} marked payment as paid for earning ${earningId}`, {
                year, month, notes
            });

            res.status(200).json(new ApiResponsive(200, updatedEarning, 'Payment marked as paid successfully'));
        }
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json(new ApiResponsive(500, null, 'Failed to update payment status'));
    }
});

// Get partner earnings with filters (admin only)
export const getPartnerEarnings = asyncHandler(async (req, res) => {
    const { partnerId } = req.params;
    const { year, month } = req.query;

    const whereClause = { partnerId };

    if (year || month) {
        whereClause.createdAt = {};

        if (year) {
            const startYear = new Date(`${year}-01-01`);
            const endYear = new Date(`${parseInt(year) + 1}-01-01`);
            whereClause.createdAt.gte = startYear;
            whereClause.createdAt.lt = endYear;
        }

        if (month && year) {
            const startMonth = new Date(`${year}-${month.padStart(2, '0')}-01`);
            const nextMonth = new Date(startMonth);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            whereClause.createdAt.gte = startMonth;
            whereClause.createdAt.lt = nextMonth;
        }
    }

    const earnings = await prisma.partnerEarning.findMany({
        where: whereClause,
        include: {
            order: {
                select: {
                    orderNumber: true,
                    total: true,
                    createdAt: true
                }
            },
            coupon: {
                select: {
                    code: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const totalAmount = earnings.reduce((sum, earning) => sum + parseFloat(earning.amount), 0);

    res.status(200).json(new ApiResponsive(200, {
        earnings,
        totalAmount,
        totalOrders: earnings.length,
        filters: { year, month }
    }, 'Partner earnings fetched successfully'));
});
