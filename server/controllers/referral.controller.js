import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";

// Generate unique referral code
const generateReferralCode = (userId) => {
  const shortId = userId.slice(-6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `REF${shortId}${random}`;
};

// Get or create referral code for user
export const getMyReferralCode = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Generate referral code if user doesn't have one
  if (!user.referralCode) {
    let newCode = generateReferralCode(userId);
    let codeExists = true;

    // Ensure code is unique
    while (codeExists) {
      const existing = await prisma.user.findUnique({
        where: { referralCode: newCode },
      });
      if (!existing) {
        codeExists = false;
      } else {
        newCode = generateReferralCode(userId + Date.now());
      }
    }

    user = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: newCode },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
      },
    });
  }

  // Get referral stats
  const stats = await prisma.referral.groupBy({
    by: ["status"],
    where: { referrerId: userId },
    _count: true,
    _sum: {
      rewardAmount: true,
    },
  });

  const totalReferrals = stats.reduce((sum, s) => sum + s._count, 0);
  const completedReferrals = stats.find((s) => s.status === "COMPLETED")?._count || 0;
  const totalEarnings = stats
    .filter((s) => s.status === "COMPLETED")
    .reduce((sum, s) => sum + parseFloat(s._sum.rewardAmount || 0), 0);

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        referralCode: user.referralCode,
        stats: {
          totalReferrals,
          completedReferrals,
          pendingReferrals: totalReferrals - completedReferrals,
          totalEarnings: totalEarnings.toFixed(2),
        },
      },
      "Referral code fetched successfully"
    )
  );
});

// Get my referral history
export const getMyReferrals = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, status } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const whereClause = {
    referrerId: userId,
    ...(status && { status: status.toUpperCase() }),
  };

  const [referrals, total] = await Promise.all([
    prisma.referral.findMany({
      where: whereClause,
      include: {
        referred: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit),
    }),
    prisma.referral.count({ where: whereClause }),
  ]);

  const formattedReferrals = referrals.map((ref) => ({
    id: ref.id,
    code: ref.code,
    referredUser: {
      id: ref.referred.id,
      name: ref.referred.name,
      email: ref.referred.email,
      joinedAt: ref.referred.createdAt,
    },
    rewardAmount: ref.rewardAmount ? parseFloat(ref.rewardAmount) : null,
    status: ref.status,
    order: ref.order
      ? {
        id: ref.order.id,
        orderNumber: ref.order.orderNumber,
        total: parseFloat(ref.order.total),
        createdAt: ref.order.createdAt,
      }
      : null,
    completedAt: ref.completedAt,
    createdAt: ref.createdAt,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        referrals: formattedReferrals,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
      "Referrals fetched successfully"
    )
  );
});

// Apply referral code during signup or checkout
export const applyReferralCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  const userId = req.user.id;

  if (!code) {
    throw new ApiError(400, "Referral code is required");
  }

  // Find user by referral code
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
  });

  if (!referrer) {
    throw new ApiError(404, "Invalid referral code");
  }

  if (referrer.id === userId) {
    throw new ApiError(400, "You cannot use your own referral code");
  }

  // Check if referral already exists
  const existingReferral = await prisma.referral.findUnique({
    where: {
      referrerId_referredId: {
        referrerId: referrer.id,
        referredId: userId,
      },
    },
  });

  if (existingReferral) {
    throw new ApiError(400, "Referral code already applied");
  }

  // Create referral record
  const referral = await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      referredId: userId,
      code: code,
      status: "PENDING",
    },
    include: {
      referrer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        referral: {
          id: referral.id,
          code: referral.code,
          referrer: referral.referrer,
          status: referral.status,
        },
      },
      "Referral code applied successfully"
    )
  );
});

// Process referral reward when order is completed
export const processReferralReward = async (orderId, userId) => {
  try {
    // Find pending referral for this user
    const referral = await prisma.referral.findFirst({
      where: {
        referredId: userId,
        status: "PENDING",
      },
      include: {
        referrer: true,
      },
      orderBy: { createdAt: "asc" }, // Process oldest referral first
    });

    if (!referral) {
      return; // No referral to process
    }

    // Get order details
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return;
    }

    // Calculate reward (e.g., 5% of order total, or fixed amount)
    // You can configure this in settings
    const rewardPercentage = 5; // 5% of order total
    const minOrderAmount = 500; // Minimum order amount to qualify
    const maxReward = 1000; // Maximum reward amount

    if (parseFloat(order.total) < minOrderAmount) {
      return; // Order amount too low
    }

    const rewardAmount = Math.min(
      (parseFloat(order.total) * rewardPercentage) / 100,
      maxReward
    );

    // Update referral with reward
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: "COMPLETED",
        rewardAmount: rewardAmount.toFixed(2),
        orderId: orderId,
        completedAt: new Date(),
      },
    });

    console.log(
      `Referral reward processed: ₹${rewardAmount.toFixed(2)} for referrer ${referral.referrer.email}`
    );
  } catch (error) {
    console.error("Error processing referral reward:", error);
    // Don't throw error, just log it
  }
};

