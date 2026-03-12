import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";

// Get all referrals (admin)
export const getAllReferrals = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    search = "",
    status,
    referrerId,
    referredId,
    sort = "createdAt",
    order = "desc",
  } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build filter conditions
  const filterConditions = {
    ...(status && { status: status.toUpperCase() }),
    ...(referrerId && { referrerId }),
    ...(referredId && { referredId }),
    ...(search && {
      OR: [
        { code: { contains: search, mode: "insensitive" } },
        {
          referrer: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          referred: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    }),
  };

  // Get total count
  const totalReferrals = await prisma.referral.count({
    where: filterConditions,
  });

  // Get referrals
  const referrals = await prisma.referral.findMany({
    where: filterConditions,
    include: {
      referrer: {
        select: {
          id: true,
          name: true,
          email: true,
          referralCode: true,
        },
      },
      referred: {
        select: {
          id: true,
          name: true,
          email: true,
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
    orderBy: { [sort]: order },
    skip,
    take: parseInt(limit),
  });

  // Format response
  const formattedReferrals = referrals.map((ref) => ({
    id: ref.id,
    code: ref.code,
    referrer: {
      id: ref.referrer.id,
      name: ref.referrer.name,
      email: ref.referrer.email,
      referralCode: ref.referrer.referralCode,
    },
    referred: {
      id: ref.referred.id,
      name: ref.referred.name,
      email: ref.referred.email,
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
    updatedAt: ref.updatedAt,
  }));

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        referrals: formattedReferrals,
        pagination: {
          total: totalReferrals,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalReferrals / parseInt(limit)),
        },
      },
      "Referrals fetched successfully"
    )
  );
});

// Get referral statistics (admin)
export const getReferralStats = asyncHandler(async (req, res) => {
  const [totalReferrals, statusCounts, totalRewards, topReferrers] = await Promise.all([
    prisma.referral.count(),
    prisma.referral.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.referral.aggregate({
      where: { status: "COMPLETED" },
      _sum: {
        rewardAmount: true,
      },
      _count: true,
    }),
    prisma.referral.groupBy({
      by: ["referrerId"],
      where: { status: "COMPLETED" },
      _count: true,
      _sum: {
        rewardAmount: true,
      },
      orderBy: {
        _count: {
          referrerId: "desc",
        },
      },
      take: 10,
    }),
  ]);

  // Get user details for top referrers
  const topReferrerIds = topReferrers.map((r) => r.referrerId);
  const topReferrerUsers = await prisma.user.findMany({
    where: { id: { in: topReferrerIds } },
    select: {
      id: true,
      name: true,
      email: true,
      referralCode: true,
    },
  });

  const topReferrersWithDetails = topReferrers.map((ref) => {
    const user = topReferrerUsers.find((u) => u.id === ref.referrerId);
    return {
      user: user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            referralCode: user.referralCode,
          }
        : null,
      totalReferrals: ref._count,
      totalEarnings: parseFloat(ref._sum.rewardAmount || 0),
    };
  });

  const stats = {
    totalReferrals,
    statusBreakdown: statusCounts.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {}),
    totalRewardsPaid: parseFloat(totalRewards._sum.rewardAmount || 0),
    completedReferrals: totalRewards._count,
    topReferrers: topReferrersWithDetails,
  };

  res.status(200).json(
    new ApiResponsive(200, { stats }, "Referral statistics fetched successfully")
  );
});

// Get referral by ID (admin)
export const getReferralById = asyncHandler(async (req, res) => {
  const { referralId } = req.params;

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    include: {
      referrer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          referralCode: true,
          createdAt: true,
        },
      },
      referred: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      order: {
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!referral) {
    throw new ApiError(404, "Referral not found");
  }

  const formattedReferral = {
    id: referral.id,
    code: referral.code,
    referrer: referral.referrer,
    referred: referral.referred,
    rewardAmount: referral.rewardAmount ? parseFloat(referral.rewardAmount) : null,
    status: referral.status,
    order: referral.order,
    completedAt: referral.completedAt,
    createdAt: referral.createdAt,
    updatedAt: referral.updatedAt,
  };

  res.status(200).json(
    new ApiResponsive(200, { referral: formattedReferral }, "Referral fetched successfully")
  );
});

// Update referral status (admin)
export const updateReferralStatus = asyncHandler(async (req, res) => {
  const { referralId } = req.params;
  const { status, rewardAmount } = req.body;

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
  });

  if (!referral) {
    throw new ApiError(404, "Referral not found");
  }

  const updateData = {};
  if (status) {
    if (!["PENDING", "COMPLETED", "CANCELLED"].includes(status.toUpperCase())) {
      throw new ApiError(400, "Invalid status. Must be PENDING, COMPLETED, or CANCELLED");
    }
    updateData.status = status.toUpperCase();
    if (status.toUpperCase() === "COMPLETED" && !referral.completedAt) {
      updateData.completedAt = new Date();
    }
  }
  if (rewardAmount !== undefined) {
    updateData.rewardAmount = parseFloat(rewardAmount).toFixed(2);
  }

  const updatedReferral = await prisma.referral.update({
    where: { id: referralId },
    data: updateData,
    include: {
      referrer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      referred: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  res.status(200).json(
    new ApiResponsive(200, { referral: updatedReferral }, "Referral updated successfully")
  );
});






