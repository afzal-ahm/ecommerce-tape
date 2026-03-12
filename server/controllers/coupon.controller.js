import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Create coupon (admin)
export const createCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minOrderAmount,
    maxUses,
    startDate,
    endDate,
    isActive = true,
    partnerId,
    partnerCommission,
    categoryIds,
    productIds,
    brandIds,
  } = req.body;

  // Validate required fields
  if (!code || !discountType || !discountValue || !startDate) {
    throw new ApiError(400, "Required fields missing");
  }

  // Convert dates to Date objects
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  // Check if code already exists
  const existingCoupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (existingCoupon) {
    throw new ApiError(409, "Coupon code already exists");
  }

  // Validate discount value
  if (
    discountType === "PERCENTAGE" &&
    (discountValue <= 0 || discountValue > 100)
  ) {
    throw new ApiError(400, "Percentage discount must be between 1 and 100");
  }

  if (discountType === "FIXED_AMOUNT" && discountValue <= 0) {
    throw new ApiError(400, "Fixed amount discount must be greater than 0");
  }

  // Create coupon
  const coupon = await prisma.coupon.create({
    data: {
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxUses,
      startDate: start,
      endDate: end,
      isActive,
      partnerId: partnerId || null,
      partnerCommission: partnerCommission || null,
    },
    include: { partner: true },
  });

  // Persist targeting relations (categories/products/brands)
  if (Array.isArray(categoryIds) && categoryIds.length) {
    const data = categoryIds.map((cId) => ({ couponId: coupon.id, categoryId: cId }));
    await prisma.couponCategory.createMany({ data, skipDuplicates: true });
  }

  if (Array.isArray(productIds) && productIds.length) {
    const data = productIds.map((pId) => ({ couponId: coupon.id, productId: pId }));
    await prisma.couponProduct.createMany({ data, skipDuplicates: true });
  }

  if (Array.isArray(brandIds) && brandIds.length) {
    const data = brandIds.map((bId) => ({ couponId: coupon.id, brandId: bId }));
    await prisma.couponBrand.createMany({ data, skipDuplicates: true });
  }

  return res
    .status(201)
    .json(new ApiResponsive(201, { coupon }, "Coupon created successfully"));
});

// Update coupon (admin)
export const updateCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;
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
    partnerId,
    partnerCommission,
    categoryIds,
    productIds,
    brandIds,
  } = req.body;

  // Check if coupon exists
  const existingCoupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!existingCoupon) {
    throw new ApiError(404, "Coupon not found");
  }

  // If updating code, check for uniqueness
  if (code && code !== existingCoupon.code) {
    const codeExists = await prisma.coupon.findUnique({
      where: { code },
    });

    if (codeExists) {
      throw new ApiError(409, "Coupon code already exists");
    }
  }

  // Validate discount value if updating
  if (discountType && discountValue) {
    if (
      discountType === "PERCENTAGE" &&
      (discountValue <= 0 || discountValue > 100)
    ) {
      throw new ApiError(400, "Percentage discount must be between 1 and 100");
    }

    if (discountType === "FIXED_AMOUNT" && discountValue <= 0) {
      throw new ApiError(400, "Fixed amount discount must be greater than 0");
    }
  }

  // Prepare update data
  const updateData = {
    ...(code && { code: code.toUpperCase() }),
    ...(description !== undefined && { description }),
    ...(discountType && { discountType }),
    ...(discountValue && { discountValue }),
    ...(minOrderAmount !== undefined && { minOrderAmount }),
    ...(maxUses !== undefined && { maxUses }),
    ...(startDate && { startDate: new Date(startDate) }),
    ...(endDate && { endDate: new Date(endDate) }),
    ...(isActive !== undefined && { isActive }),
    ...(partnerId !== undefined && { partnerId }),
    ...(partnerCommission !== undefined && { partnerCommission }),
  };

  // Update coupon
  const updatedCoupon = await prisma.coupon.update({
    where: { id: couponId },
    data: updateData,
    include: { partner: true },
  });

  // Update targeting relations: delete existing and recreate
  if (categoryIds) {
    await prisma.couponCategory.deleteMany({ where: { couponId } });
    if (Array.isArray(categoryIds) && categoryIds.length) {
      const data = categoryIds.map((cId) => ({ couponId, categoryId: cId }));
      await prisma.couponCategory.createMany({ data, skipDuplicates: true });
    }
  }

  if (productIds) {
    await prisma.couponProduct.deleteMany({ where: { couponId } });
    if (Array.isArray(productIds) && productIds.length) {
      const data = productIds.map((pId) => ({ couponId, productId: pId }));
      await prisma.couponProduct.createMany({ data, skipDuplicates: true });
    }
  }

  if (brandIds) {
    await prisma.couponBrand.deleteMany({ where: { couponId } });
    if (Array.isArray(brandIds) && brandIds.length) {
      const data = brandIds.map((bId) => ({ couponId, brandId: bId }));
      await prisma.couponBrand.createMany({ data, skipDuplicates: true });
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { coupon: updatedCoupon },
        "Coupon updated successfully"
      )
    );
});

// Get all coupons (admin)
export const getAllCoupons = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, isActive } = req.query;

  const filters = {};
  if (isActive !== undefined) {
    filters.isActive = isActive === "true";
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const take = parseInt(limit);

  // Get total count
  const totalCoupons = await prisma.coupon.count({
    where: filters,
  });

  // Get coupons with pagination
  const coupons = await prisma.coupon.findMany({
    where: filters,
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take,
    include: { partner: true },
  });

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        coupons,
        pagination: {
          total: totalCoupons,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCoupons / parseInt(limit)),
        },
      },
      "Coupons fetched successfully"
    )
  );
});

// Get coupon by ID (admin)
export const getCouponById = asyncHandler(async (req, res) => {
  const { couponId } = req.params;

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    include: {
      partner: true,
      categories: { include: { category: true } },
      products: { include: { product: true } },
      brands: { include: { brand: true } },
    },
  });

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  return res
    .status(200)
    .json(new ApiResponsive(200, { coupon }, "Coupon fetched successfully"));
});

// Delete coupon (admin)
export const deleteCoupon = asyncHandler(async (req, res) => {
  const { couponId } = req.params;

  // Check if coupon exists
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
  });

  if (!coupon) {
    throw new ApiError(404, "Coupon not found");
  }

  // Delete coupon
  await prisma.coupon.delete({
    where: { id: couponId },
  });

  return res
    .status(200)
    .json(new ApiResponsive(200, {}, "Coupon deleted successfully"));
});

// Verify coupon (public)
export const verifyCoupon = asyncHandler(async (req, res) => {
  const { code, cartTotal, cartItems } = req.body;

  if (!code) {
    throw new ApiError(400, "Coupon code is required");
  }

  // Find coupon by code and include targeting info
  const coupon = await prisma.coupon.findFirst({
    where: { code, isActive: true },
    include: { categories: true, products: true, brands: true },
  });

  if (!coupon) {
    throw new ApiError(404, "Invalid coupon code");
  }

  // Compute applicable subtotal: if cartItems present, compute per-item matches; else fall back to cartTotal
  let applicableSubtotal = parseFloat(cartTotal || 0);
  let matchedItemCount = 0;
  if (Array.isArray(cartItems) && cartItems.length) {
    // cartItems: [{ productId, productVariantId, price, quantity }]
    let subtotal = 0;
    for (const item of cartItems) {
      subtotal += parseFloat(item.price) * (item.quantity || 1);
    }
    applicableSubtotal = subtotal;

    // If coupon has targets, compute only matching items subtotal
    const hasTargets =
      (coupon.categories && coupon.categories.length) ||
      (coupon.products && coupon.products.length) ||
      (coupon.brands && coupon.brands.length);

    if (hasTargets) {
      const categorySet = new Set((coupon.categories || []).map((c) => c.categoryId));
      const productSet = new Set((coupon.products || []).map((p) => p.productId));
      const brandSet = new Set((coupon.brands || []).map((b) => b.brandId));

      let matchedSubtotal = 0;
      for (const item of cartItems) {
        // item must include productId and brandId and categoryIds if possible
        const pid = item.productId;
        const bid = item.brandId;
        const cats = item.categoryIds || [];
        const price = parseFloat(item.price) * (item.quantity || 1);

        const productMatch = productSet.has(pid);
        const brandMatch = bid && brandSet.has(bid);
        const categoryMatch = cats.some((c) => categorySet.has(c));

        if (productMatch || brandMatch || categoryMatch) {
          matchedItemCount++;
          matchedSubtotal += price;
        }
      }

      applicableSubtotal = matchedSubtotal;
      if (hasTargets && matchedItemCount === 0) {
        throw new ApiError(400, "This coupon does not apply to the products in your cart");
      }
    }
  }

  // Check minimum order amount
  if (coupon.minOrderAmount && applicableSubtotal < parseFloat(coupon.minOrderAmount)) {
    throw new ApiError(400, `Minimum order amount of ₹${coupon.minOrderAmount} required`);
  }

  // Check if maximum uses exceeded
  if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) {
    throw new ApiError(400, "Coupon usage limit exceeded");
  }

  // Calculate discount based on applicableSubtotal
  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    // Cap percentage discount at 90%
    const cappedDiscountValue = Math.min(parseFloat(coupon.discountValue), 90);
    discountAmount = (applicableSubtotal * cappedDiscountValue) / 100;
  } else {
    discountAmount = parseFloat(coupon.discountValue);
  }

  // Ensure discount is not more than 90% of applicable subtotal
  const maxDiscountAllowed = applicableSubtotal * 0.9; // Maximum 90% discount
  discountAmount = Math.min(discountAmount, maxDiscountAllowed);

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discountAmount: discountAmount.toFixed(2),
          applicableSubtotal: applicableSubtotal.toFixed(2),
          matchedItems: matchedItemCount,
          finalAmount: (parseFloat(cartTotal || 0) - discountAmount).toFixed(2),
        },
      },
      "Coupon applied successfully"
    )
  );
});

// Apply coupon to cart (private)
export const applyCoupon = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { code } = req.body;

  if (!code) {
    throw new ApiError(400, "Coupon code is required");
  }

  // Find coupon by code (regardless of date validity initially)
  const coupon = await prisma.coupon.findFirst({
    where: { code, isActive: true },
    include: { categories: true, products: true, brands: true },
  });

  if (!coupon) {
    throw new ApiError(404, "Invalid coupon code");
  }

  // REMOVING TEMPORARILY: Date validation for testing
  // Until we update the actual coupon dates in the database
  /*
  // Check date validity
  const currentDate = new Date();
  const startDate = coupon.startDate ? new Date(coupon.startDate) : null;
  const endDate = coupon.endDate ? new Date(coupon.endDate) : null;

  if (startDate && startDate > currentDate) {
    throw new ApiError(400, "This coupon is not active yet");
  }

  if (endDate && endDate < currentDate) {
    throw new ApiError(400, "This coupon has expired");
  }
  */

  // Check if maximum uses exceeded
  if (coupon.maxUses && (coupon.usedCount || 0) >= coupon.maxUses) {
    throw new ApiError(400, "Coupon usage limit exceeded");
  }

  // Get user's cart
  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      productVariant: {
        include: {
          product: { include: { categories: { include: { category: true } }, brand: true } },
        },
      },
    },
  });

  if (!cartItems.length) {
    throw new ApiError(400, "Your cart is empty");
  }

  // Calculate cart total
  let cartTotal = 0;
  for (const item of cartItems) {
    const pv = item.productVariant;
    const price = parseFloat(pv.salePrice || pv.price);
    cartTotal += price * item.quantity;
  }

  // Compute applicable subtotal based on coupon targets
  let applicableSubtotal = cartTotal;
  const hasTargets =
    (coupon.categories && coupon.categories.length) ||
    (coupon.products && coupon.products.length) ||
    (coupon.brands && coupon.brands.length);

  let matchedItemCount = 0;
  if (hasTargets) {
    const categorySet = new Set((coupon.categories || []).map((c) => c.categoryId));
    const productSet = new Set((coupon.products || []).map((p) => p.productId));
    const brandSet = new Set((coupon.brands || []).map((b) => b.brandId));

    let matchedSubtotal = 0;
    for (const item of cartItems) {
      const pv = item.productVariant;
      const prod = pv.product;
      const price = parseFloat(pv.salePrice || pv.price) * item.quantity;

      const productMatch = productSet.has(prod.id);
      const brandMatch = prod.brandId && brandSet.has(prod.brandId);
      const categoryIds = (prod.categories || []).map((pc) => pc.categoryId);
      const categoryMatch = categoryIds.some((c) => categorySet.has(c));

      if (productMatch || brandMatch || categoryMatch) {
        matchedItemCount++;
        matchedSubtotal += price;
      }
    }

    applicableSubtotal = matchedSubtotal;
    if (matchedItemCount === 0) {
      throw new ApiError(400, "This coupon does not apply to the products in your cart");
    }
  }

  // Check minimum order amount based on applicable subtotal
  if (coupon.minOrderAmount && applicableSubtotal < parseFloat(coupon.minOrderAmount)) {
    throw new ApiError(400, `Minimum order amount of ₹${coupon.minOrderAmount} required`);
  }

  // Calculate discount based on applicable subtotal
  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    const cappedDiscountValue = Math.min(parseFloat(coupon.discountValue), 90);
    discountAmount = (applicableSubtotal * cappedDiscountValue) / 100;
  } else {
    discountAmount = parseFloat(coupon.discountValue);
  }

  // Ensure discount is not more than 90% of applicable subtotal
  const maxDiscountAllowed = applicableSubtotal * 0.9;
  discountAmount = Math.min(discountAmount, maxDiscountAllowed);

  return res.status(200).json(
    new ApiResponsive(
      200,
      {
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        },
        cartTotal: cartTotal.toFixed(2),
        applicableSubtotal: applicableSubtotal.toFixed(2),
        matchedItems: matchedItemCount,
        discountAmount: discountAmount.toFixed(2),
        finalAmount: (cartTotal - discountAmount).toFixed(2),
      },
      "Coupon applied successfully"
    )
  );
});
