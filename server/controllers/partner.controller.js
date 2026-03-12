;
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponsive } from '../utils/ApiResponsive.js';
import { prisma } from '../config/db.js';


// Register as partner (public)
export const registerPartner = asyncHandler(async (req, res) => {
    const { name, email, number, city, state, message } = req.body;
    if (!name || !email || !number || !city || !state || !message) {
        return res.status(400).json(new ApiResponsive(400, null, 'All fields are required'));
    }
    // Check if already requested
    const exists = await prisma.partnerRequest.findFirst({ where: { email } });
    if (exists) {
        return res.status(409).json(new ApiResponsive(409, null, 'Request already submitted'));
    }
    const request = await prisma.partnerRequest.create({
        data: { name, email, number, city, state, message },
    });
    res.status(201).json(new ApiResponsive(201, { request }, 'Request submitted'));
});

// Partner login (only if approved)
export const partnerLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json(new ApiResponsive(400, null, 'Email and password required'));
    }
    const partner = await prisma.partner.findUnique({ where: { email } });
    if (!partner || !partner.isActive) {
        return res.status(401).json(new ApiResponsive(401, null, 'Invalid credentials'));
    }
    const match = await bcrypt.compare(password, partner.password);
    if (!match) {
        return res.status(401).json(new ApiResponsive(401, null, 'Invalid credentials'));
    }
    // Generate JWT
    const token = jwt.sign({ id: partner.id, email: partner.email, role: 'partner' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json(new ApiResponsive(200, { token, partner: { id: partner.id, name: partner.name, email: partner.email } }, 'Login successful'));
});

// Get partner profile (protected)
export const getPartnerProfile = asyncHandler(async (req, res) => {
    const partner = await prisma.partner.findUnique({
        where: { id: req.partner.id },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            commissionRate: true,
            isActive: true,
            createdAt: true
        }
    });

    res.status(200).json(new ApiResponsive(200, { partner }, 'Profile fetched successfully'));
});

// Get partner dashboard stats (protected)
export const getPartnerDashboard = asyncHandler(async (req, res) => {
    const partnerId = req.partner.id;

    // Get total coupons assigned to this partner
    const totalCoupons = await prisma.couponPartner.count({
        where: { partnerId }
    });

    // Get only DELIVERED orders for commission calculation
    const orders = await prisma.order.findMany({
        where: {
            status: 'DELIVERED', // Only count delivered orders for earnings
            coupon: {
                couponPartners: {
                    some: { partnerId }
                }
            }
        },
        include: {
            coupon: {
                include: {
                    couponPartners: {
                        where: { partnerId }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Calculate actual commission earned from each order
    let totalOrderValue = 0;
    let totalCommissionEarned = 0;
    let totalCommissionRate = 0;

    orders.forEach(order => {
        const orderAmount = parseFloat(order.total || 0);
        const commissionPercentage = order.coupon?.couponPartners[0]?.commission || 0;
        const commissionEarned = (orderAmount * commissionPercentage) / 100;

        totalOrderValue += orderAmount;
        totalCommissionEarned += commissionEarned;
        totalCommissionRate += commissionPercentage;
    });

    // Calculate average commission rate
    const averageCommissionRate = orders.length > 0 ? totalCommissionRate / orders.length : 0;

    // Get recent orders (top 3)
    const recentOrders = orders.slice(0, 3);

    res.status(200).json(new ApiResponsive(200, {
        stats: {
            totalCoupons,
            totalEarnings: parseFloat(totalOrderValue.toFixed(2)),
            estimatedCommission: parseFloat(totalCommissionEarned.toFixed(2)),
            commissionRate: parseFloat(averageCommissionRate.toFixed(2))
        },
        recentOrders
    }, 'Dashboard data fetched successfully'));
});

// Get partner coupons (protected)
export const getPartnerCoupons = asyncHandler(async (req, res) => {
    const partnerId = req.partner.id;

    const coupons = await prisma.couponPartner.findMany({
        where: { partnerId },
        include: {
            coupon: {
                include: {
                    _count: {
                        select: {
                            orders: {
                                where: {
                                    status: 'DELIVERED' // Only count delivered orders
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Calculate actual earnings for each coupon (only from delivered orders)
    const couponsWithEarnings = await Promise.all(
        coupons.map(async (couponPartner) => {
            // Get only DELIVERED orders using this specific coupon for this partner
            const ordersForCoupon = await prisma.order.findMany({
                where: {
                    couponId: couponPartner.couponId,
                    status: 'DELIVERED', // Only delivered orders count for earnings
                    coupon: {
                        couponPartners: {
                            some: { partnerId: couponPartner.partnerId }
                        }
                    }
                },
                include: {
                    coupon: {
                        include: {
                            couponPartners: {
                                where: { partnerId: couponPartner.partnerId }
                            }
                        }
                    }
                }
            });

            // Calculate actual earnings from delivered orders only
            let actualEarnings = 0;
            ordersForCoupon.forEach(order => {
                const orderAmount = parseFloat(order.total || 0);
                const commissionRate = order.coupon?.couponPartners[0]?.commission || couponPartner.commission || 0;
                actualEarnings += (orderAmount * commissionRate) / 100;
            });

            return {
                ...couponPartner,
                actualEarnings: parseFloat(actualEarnings.toFixed(2)),
                orderCount: ordersForCoupon.length
            };
        })
    );

    res.status(200).json(new ApiResponsive(200, { coupons: couponsWithEarnings }, 'Coupons fetched successfully'));
});

// Get partner earnings (protected)
export const getPartnerEarnings = asyncHandler(async (req, res) => {
    const partnerId = req.partner.id;
    const { period = 'all' } = req.query;

    // Build date filter based on period
    let dateFilter = {};
    const now = new Date();

    switch (period) {
        case 'today':
            dateFilter = {
                createdAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                    lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
                }
            };
            break;
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = {
                createdAt: {
                    gte: weekAgo
                }
            };
            break;
        case 'month':
            dateFilter = {
                createdAt: {
                    gte: new Date(now.getFullYear(), now.getMonth(), 1)
                }
            };
            break;
        case 'year':
            dateFilter = {
                createdAt: {
                    gte: new Date(now.getFullYear(), 0, 1)
                }
            };
            break;
        default:
            // 'all' - no date filter
            break;
    }

    // Get detailed earnings with orders (only DELIVERED orders)
    const orders = await prisma.order.findMany({
        where: {
            ...dateFilter,
            status: 'DELIVERED', // Only show earnings from delivered orders
            coupon: {
                couponPartners: {
                    some: { partnerId }
                }
            }
        },
        include: {
            coupon: {
                include: {
                    couponPartners: {
                        where: { partnerId }
                    }
                }
            },
            user: {
                select: {
                    name: true,
                    email: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Calculate earnings for each order
    const earningsData = orders.map(order => {
        const couponPartner = order.coupon?.couponPartners[0];
        const commissionRate = couponPartner?.commission || 0;
        const orderTotal = parseFloat(order.total || 0);
        const earningAmount = (orderTotal * commissionRate) / 100;

        return {
            id: order.id,
            orderNumber: order.orderNumber,
            orderAmount: orderTotal,
            commission: commissionRate,
            earningAmount: parseFloat(earningAmount.toFixed(2)),
            couponCode: order.coupon?.code,
            customerName: order.user?.name,
            customerEmail: order.user?.email,
            orderStatus: order.status,
            paymentStatus: order.razorpayPayment ? 'paid' : 'pending',
            date: order.createdAt,
            createdAt: order.createdAt
        };
    });

    // Calculate summary statistics
    const totalEarnings = earningsData.reduce((sum, earning) => sum + earning.earningAmount, 0);
    const totalOrders = earningsData.length;
    const averageCommission = totalOrders > 0
        ? earningsData.reduce((sum, earning) => sum + earning.commission, 0) / totalOrders
        : 0;

    // Calculate this month's earnings
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarnings = earningsData
        .filter(earning => new Date(earning.date) >= thisMonth)
        .reduce((sum, earning) => sum + earning.earningAmount, 0);

    const summary = {
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        monthlyEarnings: parseFloat(monthlyEarnings.toFixed(2)),
        totalOrders,
        averageCommission: parseFloat(averageCommission.toFixed(2)),
        period
    };

    res.status(200).json(new ApiResponsive(200, {
        earnings: earningsData,
        summary
    }, 'Earnings fetched successfully'));
});

// Get partner earnings with enhanced filtering and monthly summary (protected)
export const getPartnerEarningsEnhanced = asyncHandler(async (req, res) => {
    const partnerId = req.partner.id;
    const { year, month, startDate, endDate } = req.query;

    // Build date filter
    let dateFilter = {};
    if (year || month || startDate || endDate) {
        dateFilter.createdAt = {};

        if (year) {
            const startYear = new Date(`${year}-01-01`);
            const endYear = new Date(`${parseInt(year) + 1}-01-01`);
            dateFilter.createdAt.gte = startYear;
            dateFilter.createdAt.lt = endYear;
        }

        if (month && year) {
            const startMonth = new Date(`${year}-${month.padStart(2, '0')}-01`);
            const nextMonth = new Date(startMonth);
            nextMonth.setMonth(nextMonth.getMonth() + 1);

            dateFilter.createdAt.gte = startMonth;
            dateFilter.createdAt.lt = nextMonth;
        }

        if (startDate) {
            dateFilter.createdAt.gte = new Date(startDate);
        }

        if (endDate) {
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);
            dateFilter.createdAt.lte = endDateTime;
        }
    }

    // Get detailed earnings
    const earnings = await prisma.partnerEarning.findMany({
        where: {
            partnerId,
            ...dateFilter
        },
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
                    code: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Calculate total earnings for summary
    const allEarnings = await prisma.partnerEarning.findMany({
        where: { partnerId },
        include: {
            order: { select: { createdAt: true } }
        }
    });

    // Fetch actual monthly earnings from database
    const dbMonthlyEarnings = await prisma.partnerMonthlyEarning.findMany({
        where: { partnerId },
        orderBy: [
            { year: 'desc' },
            { month: 'desc' }
        ]
    });

    // Group all earnings by month/year for monthly summary (fallback for months not in DB)
    const monthlyEarningsMap = {};
    allEarnings.forEach(earning => {
        const date = new Date(earning.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;

        if (!monthlyEarningsMap[key]) {
            monthlyEarningsMap[key] = {
                year,
                month,
                totalAmount: 0,
                totalOrders: 0,
                paymentStatus: 'PENDING',
                paidAt: null
            };
        }

        monthlyEarningsMap[key].totalAmount += parseFloat(earning.amount);
        monthlyEarningsMap[key].totalOrders += 1;
    });

    // Use database monthly earnings if available, otherwise use calculated ones
    let monthlyEarnings;
    if (dbMonthlyEarnings.length > 0) {
        monthlyEarnings = dbMonthlyEarnings.map(monthly => ({
            year: monthly.year,
            month: monthly.month,
            totalAmount: parseFloat(monthly.totalAmount),
            totalOrders: monthly.totalOrders,
            paymentStatus: monthly.paymentStatus,
            paidAt: monthly.paidAt
        }));
    } else {
        // Convert to array and sort by year/month desc
        monthlyEarnings = Object.values(monthlyEarningsMap).sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    }

    // Calculate summary with proper paid/pending amounts
    const totalEarnings = allEarnings.reduce((sum, earning) => sum + parseFloat(earning.amount), 0);
    const filteredTotal = earnings.reduce((sum, earning) => sum + parseFloat(earning.amount), 0);

    // Calculate paid amount from monthly earnings
    const paidAmount = monthlyEarnings
        .filter(monthly => monthly.paymentStatus === 'PAID')
        .reduce((sum, monthly) => sum + monthly.totalAmount, 0);

    const pendingAmount = totalEarnings - paidAmount;

    const summary = {
        totalEarnings: parseFloat(totalEarnings.toFixed(2)),
        pendingAmount: parseFloat(pendingAmount.toFixed(2)),
        paidAmount: parseFloat(paidAmount.toFixed(2)),
        totalOrders: allEarnings.length,
        filteredTotal: parseFloat(filteredTotal.toFixed(2)),
        filteredOrders: earnings.length,
        averageCommission: earnings.length > 0
            ? parseFloat((earnings.reduce((sum, e) => sum + e.percentage, 0) / earnings.length).toFixed(2))
            : 0
    };

    res.status(200).json(new ApiResponsive(200, {
        earnings: earnings.map(earning => {
            const date = new Date(earning.createdAt);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            // Find corresponding monthly earning to get payment status
            const monthlyEarning = monthlyEarnings.find(
                m => m.year === year && m.month === month
            );

            return {
                id: earning.id,
                orderId: earning.order?.orderNumber || earning.orderId,
                productName: earning.productName || 'N/A',
                commission: parseFloat(earning.amount),
                percentage: earning.percentage,
                status: monthlyEarning?.paymentStatus || 'PENDING',
                createdAt: earning.createdAt,
                couponCode: earning.coupon?.code || null,
                orderTotal: earning.order?.total || 0,
                customerName: earning.order?.user?.name || 'N/A'
            };
        }),
        monthlyEarnings: monthlyEarnings.map(monthly => ({
            month: `${monthly.year}-${monthly.month.toString().padStart(2, '0')}`,
            totalEarnings: monthly.totalAmount,
            commissionCount: monthly.totalOrders,
            paymentStatus: monthly.paymentStatus,
            paidAt: monthly.paidAt
        })),
        stats: {
            totalEarnings: summary.totalEarnings,
            thisMonthEarnings: summary.filteredTotal,
            pendingPayments: summary.pendingAmount,
            totalCommissions: summary.totalOrders
        },
        filters: { year, month, startDate, endDate }
    }, 'Enhanced earnings data fetched successfully'));
});
