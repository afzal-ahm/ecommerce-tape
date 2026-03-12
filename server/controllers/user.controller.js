import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  generateAccessAndRefreshTokens,
  setCookies,
} from "../helper/generateAccessAndRefreshTokens.js";
import { validatePassword } from "../helper/validatePassword.js";
import { deleteFromS3, getFileUrl } from "../utils/deleteFromS3.js";
import { processAndUploadImage } from "../middlewares/multer.middlerware.js";

import sendEmail from "../utils/sendEmail.js";
import {
  getResetTemplate,
  getDeleteTemplate,
  getEmailOtpTemplate,
} from "../email/temp/EmailTemplate.js";
import {
  generateOTP,
  isValidOTP,
  isExpiredOTP,
} from "../helper/generateOTP.js";

// Register a new user
export const registerUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, referralCode } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError(409, "Email already registered");
  }

  // Validate password
  validatePassword(password);

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate 6-digit OTP for email verification
  const otpCode = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

  // Generate referral code for new user
  const generateUserReferralCode = (userId) => {
    const shortId = userId.slice(-6).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `REF${shortId}${random}`;
  };

  // Create user with referral code processing
  const newUser = await prisma.$transaction(async (tx) => {
    // Create user first (we need the ID for referral code)
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || "",
        otp: otpCode,
        otpVerified: false,
        otpVerifiedExpiry: otpExpiry,
      },
    });

    // Generate unique referral code for this user
    let userReferralCode = generateUserReferralCode(user.id);
    let codeExists = true;

    // Ensure code is unique
    while (codeExists) {
      const existing = await tx.user.findUnique({
        where: { referralCode: userReferralCode },
      });
      if (!existing) {
        codeExists = false;
      } else {
        userReferralCode = generateUserReferralCode(user.id + Date.now());
      }
    }

    // Update user with referral code
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { referralCode: userReferralCode },
    });

    // Process referral code if provided
    if (referralCode) {
      try {
        // Find referrer by referral code
        const referrer = await tx.user.findUnique({
          where: { referralCode: referralCode },
        });

        if (referrer && referrer.id !== user.id) {
          // Check if referral already exists
          const existingReferral = await tx.referral.findUnique({
            where: {
              referrerId_referredId: {
                referrerId: referrer.id,
                referredId: user.id,
              },
            },
          });

          if (!existingReferral) {
            // Create referral record
            await tx.referral.create({
              data: {
                referrerId: referrer.id,
                referredId: user.id,
                code: referralCode,
                status: "PENDING",
              },
            });
          }
        }
      } catch (error) {
        console.error(
          "Error processing referral code during registration:",
          error
        );
        // Don't fail registration if referral processing fails
      }
    }

    return updatedUser;
  });

  // Remove sensitive data from response
  const userWithoutPassword = { ...newUser };
  delete userWithoutPassword.password;
  delete userWithoutPassword.otp;

  // Send OTP email
  try {
    await sendEmail({
      email,
      subject: "Your OTP for Email Verification - dfixventure",
      html: getEmailOtpTemplate(otpCode, 10),
    });

    // Log only recipient email — do NOT log the OTP code
    console.log("Verification OTP sent to:", email);
  } catch (error) {
    console.error("Error sending verification email:", error);
    // Don't throw error, still allow registration
  }

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        userWithoutPassword,
        "User registered successfully. Please verify with the OTP sent to your email."
      )
    );
});

// Login user
export const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if user account is active
  if (!user.isActive) {
    throw new ApiError(403, "Your account has been deactivated");
  }

  // Check if user has a password set (could be null for OAuth users)
  if (!user.password) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Check if email (OTP) is verified
  if (!user.otpVerified) {
    throw new ApiError(
      403,
      "Please verify your email using the OTP sent to you"
    );
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id
  );

  // Set cookies
  setCookies(res, accessToken, refreshToken);

  // Remove sensitive data from response
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.password;
  delete userWithoutPassword.otp;

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        user: userWithoutPassword,
        accessToken,
      },
      "Logged in successfully"
    )
  );
});

// Logout user
export const logoutUser = asyncHandler(async (req, res, next) => {
  try {
    // Clear cookies regardless of whether a user is authenticated
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json(new ApiResponsive(200, {}, "Logged out successfully"));
  } catch (error) {
    console.error("Logout error:", error);
    return res
      .status(200)
      .json(new ApiResponsive(200, {}, "Logged out successfully"));
  }
});

// Refresh token
export const refreshAccessToken = asyncHandler(async (req, res, next) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // Verify token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
    });

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // Since we're not storing the refresh token in the database anymore,
    // we can't validate it against a stored token
    // We'll rely on JWT verification instead

    // Generate new tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user.id
    );

    // Set cookies
    setCookies(res, accessToken, refreshToken);

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Verify email
export const verifyEmail = asyncHandler(async (req, res, next) => {
  // Legacy endpoint kept for backward compatibility with old email-links.
  // The system now uses OTP verification via /users/verify-otp
  return res
    .status(410)
    .json(
      new ApiResponsive(
        410,
        {},
        "Link-based verification is deprecated. Please verify using OTP."
      )
    );
});

// Verify OTP
export const verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, "Email and OTP are required");
  }

  if (!isValidOTP(otp)) {
    throw new ApiError(400, "Invalid OTP format");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.otpVerified) {
    return res
      .status(200)
      .json(new ApiResponsive(200, {}, "Email already verified"));
  }

  if (!user.otp || !user.otpVerifiedExpiry) {
    throw new ApiError(400, "OTP not requested or expired");
  }

  // Check expiry
  if (isExpiredOTP(user.otpVerifiedExpiry, 0)) {
    // If expiry time has passed
    throw new ApiError(400, "OTP has expired. Please request a new one");
  }

  if (user.otp !== otp) {
    throw new ApiError(400, "Incorrect OTP");
  }

  // Mark verified and clear OTP
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpVerified: true,
      otp: null,
      otpVerifiedExpiry: null,
    },
  });

  // Generate tokens for auto-login
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id
  );

  // Set cookies
  setCookies(res, accessToken, refreshToken);

  // Remove sensitive data from response
  const userWithoutPassword = { ...user };
  delete userWithoutPassword.password;
  delete userWithoutPassword.otp;
  delete userWithoutPassword.otpVerifiedExpiry;
  userWithoutPassword.otpVerified = true;

  return res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        {
          user: userWithoutPassword,
          accessToken,
        },
        "Email verified and logged in successfully"
      )
    );
});

// Forgot password - request reset
export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Return success even if user doesn't exist (for security)
    return res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "If your email is registered, you will receive a password reset link"
        )
      );
  }

  // Generate JWT reset token (no DB storage required)
  const resetToken = jwt.sign(
    { id: user.id, purpose: "pwdreset" },
    process.env.RESET_TOKEN_SECRET || process.env.ACCESS_JWT_SECRET,
    { expiresIn: "1h" }
  );

  // Send password reset email
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      email,
      subject: "Reset Your Password - dfixventure",
      html: getResetTemplate(resetLink),
    });

    console.log("Password reset email sent to:", email);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    // Don't throw error, still return success response
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        {},
        "If your email is registered, you will receive a password reset link"
      )
    );
});

// Reset password with token
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token || !password) {
    throw new ApiError(400, "Reset token and new password are required");
  }

  // Validate password
  validatePassword(password);

  try {
    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.RESET_TOKEN_SECRET || process.env.ACCESS_JWT_SECRET
    );

    if (!decoded || decoded.purpose !== "pwdreset") {
      throw new ApiError(400, "Invalid reset token");
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      },
    });

    res
      .status(200)
      .json(new ApiResponsive(200, {}, "Password reset successful"));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(400, "Invalid reset token");
  }
});

// Change password
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current password and new password are required");
  }

  // Validate new password
  validatePassword(newPassword);

  // Find user
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(400, "Current password is incorrect");
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Password changed successfully"));
});

// Get current user profile
export const getCurrentUser = asyncHandler(async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      throw new ApiError(401, "User not authenticated");
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        addresses: {
          orderBy: {
            isDefault: "desc",
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Remove sensitive data
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    delete userWithoutPassword.otp;
    delete userWithoutPassword.otpVerifiedExpiry;

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          { user: userWithoutPassword },
          "User details fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    // If it's already an ApiError, rethrow it
    if (error instanceof ApiError) {
      throw error;
    }
    // Otherwise, wrap it in an ApiError
    throw new ApiError(500, "Failed to fetch user details", [error.message]);
  }
});

// Update user profile
export const updateUserProfile = asyncHandler(async (req, res, next) => {
  const { name, phone } = req.body;
  let profileImage = null;

  // Process profile image if provided
  if (req.file) {
    // Get current user to check if there's an existing image to delete
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { profileImage: true },
    });

    // Delete old image if it exists
    if (currentUser.profileImage) {
      await deleteFromS3(currentUser.profileImage);
    }

    // Upload new image
    profileImage = await processAndUploadImage(req.file);
  }

  // Prepare update data
  const updateData = {
    ...(name && { name }),
    ...(phone && { phone }),
    ...(profileImage && { profileImage }),
  };

  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
  });

  // Remove sensitive data
  const userWithoutPassword = { ...updatedUser };
  delete userWithoutPassword.password;
  delete userWithoutPassword.otp;

  // Add full URL for profile image
  if (userWithoutPassword.profileImage) {
    userWithoutPassword.profileImageUrl = getFileUrl(
      userWithoutPassword.profileImage
    );
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { user: userWithoutPassword },
        "Profile updated successfully"
      )
    );
});

// Add address
export const addUserAddress = asyncHandler(async (req, res, next) => {
  const { name, street, city, state, postalCode, country, phone, isDefault } =
    req.body;

  // Validate required fields
  if (!street || !city || !state || !postalCode || !country) {
    throw new ApiError(400, "All address fields are required");
  }

  // If setting as default, clear default flag from other addresses
  if (isDefault) {
    await prisma.address.updateMany({
      where: {
        userId: req.user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  // Create new address
  const newAddress = await prisma.address.create({
    data: {
      userId: req.user.id,
      name,
      street,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault: isDefault || false,
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(
        201,
        { address: newAddress },
        "Address added successfully"
      )
    );
});

// Update address
export const updateUserAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;
  const { name, street, city, state, postalCode, country, phone, isDefault } =
    req.body;

  // Check if address exists and belongs to user
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId: req.user.id,
    },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  // If setting as default, clear default flag from other addresses
  if (isDefault) {
    await prisma.address.updateMany({
      where: {
        userId: req.user.id,
        isDefault: true,
        id: { not: addressId },
      },
      data: { isDefault: false },
    });
  }

  // Update address
  const updatedAddress = await prisma.address.update({
    where: { id: addressId },
    data: {
      ...(name !== undefined && { name }),
      ...(street !== undefined && { street }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(postalCode !== undefined && { postalCode }),
      ...(country !== undefined && { country }),
      ...(phone !== undefined && { phone }),
      ...(isDefault !== undefined && { isDefault }),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { address: updatedAddress },
        "Address updated successfully"
      )
    );
});

// Delete address
export const deleteUserAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;

  // Check if address exists and belongs to user
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId: req.user.id,
    },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  // Delete address
  await prisma.address.delete({
    where: { id: addressId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Address deleted successfully"));
});

// Set address as default
export const setDefaultAddress = asyncHandler(async (req, res, next) => {
  const { addressId } = req.params;

  // Check if address exists and belongs to user
  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId: req.user.id,
    },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  // Clear default flag from all other addresses
  await prisma.address.updateMany({
    where: {
      userId: req.user.id,
      isDefault: true,
      id: { not: addressId },
    },
    data: { isDefault: false },
  });

  // Set this address as default
  const updatedAddress = await prisma.address.update({
    where: { id: addressId },
    data: { isDefault: true },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { address: updatedAddress },
        "Address set as default successfully"
      )
    );
});

// Get all addresses for current user
export const getUserAddresses = asyncHandler(async (req, res, next) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(200, { addresses }, "Addresses fetched successfully")
    );
});

// Add product to wishlist
export const addToWishlist = asyncHandler(async (req, res, next) => {
  const { productId } = req.body;

  if (!productId) {
    throw new ApiError(400, "Product ID is required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if already in wishlist
  const existingWishlistItem = await prisma.wishlistItem.findFirst({
    where: {
      userId: req.user.id,
      productId,
    },
  });

  if (existingWishlistItem) {
    throw new ApiError(409, "Product already in wishlist");
  }

  // Add to wishlist
  const wishlistItem = await prisma.wishlistItem.create({
    data: {
      userId: req.user.id,
      productId,
    },
    include: {
      product: {
        include: {
          images: true,
          variants: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  res
    .status(201)
    .json(
      new ApiResponsive(201, { wishlistItem }, "Product added to wishlist")
    );
});

// Remove product from wishlist
export const removeFromWishlist = asyncHandler(async (req, res, next) => {
  const { wishlistItemId } = req.params;

  // Check if wishlist item exists and belongs to user
  const wishlistItem = await prisma.wishlistItem.findFirst({
    where: {
      id: wishlistItemId,
      userId: req.user.id,
    },
  });

  if (!wishlistItem) {
    throw new ApiError(404, "Wishlist item not found");
  }

  // Delete wishlist item
  await prisma.wishlistItem.delete({
    where: { id: wishlistItemId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Product removed from wishlist"));
});

// Get user's wishlist
export const getUserWishlist = asyncHandler(async (req, res, next) => {
  try {
    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: {
        product: {
          include: {
            images: true,
            variants: {
              include: {
                attributes: {
                  include: {
                    attributeValue: {
                      include: {
                        attribute: true,
                      },
                    },
                  },
                },
                images: true,
              },
            },
            reviews: {
              where: { status: "APPROVED" },
              select: { rating: true },
            },
            _count: {
              select: {
                reviews: true,
                variants: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Batch fetch active flash sales for wishlist products
    const now = new Date();
    const productIds = wishlistItems.map(item => item.productId);

    const flashSaleProducts = await prisma.flashSaleProduct.findMany({
      where: {
        productId: { in: productIds },
        flashSale: {
          isActive: true,
          startTime: { lte: now },
          endTime: { gte: now },
        },
      },
      include: {
        flashSale: {
          select: {
            id: true,
            name: true,
            discountPercentage: true,
            endTime: true,
          },
        },
      },
    });

    // Create flash sale map
    const flashSaleMap = {};
    flashSaleProducts.forEach(fsp => {
      flashSaleMap[fsp.productId] = {
        isActive: true,
        flashSaleId: fsp.flashSale.id,
        name: fsp.flashSale.name,
        discountPercentage: fsp.flashSale.discountPercentage,
        endTime: fsp.flashSale.endTime,
      };
    });

    // Format the response with improved image handling
    const formattedItems = wishlistItems.map((item) => {
      const product = item.product;

      // Enhanced image handling with fallback logic
      let primaryImageUrl = null;
      const allImages = [];

      // Priority 1: Product images
      if (product.images && product.images.length > 0) {
        const primaryImage = product.images.find((img) => img.isPrimary);
        primaryImageUrl = primaryImage
          ? primaryImage.url
          : product.images[0].url;

        // Add all product images to the images array
        allImages.push(...product.images.map((img) => getFileUrl(img.url)));
      }
      // Priority 2: Variant images as fallback
      else if (product.variants && product.variants.length > 0) {
        const variantWithImages = product.variants.find(
          (variant) => variant.images && variant.images.length > 0
        );
        if (variantWithImages) {
          const primaryImage = variantWithImages.images.find(
            (img) => img.isPrimary
          );
          primaryImageUrl = primaryImage
            ? primaryImage.url
            : variantWithImages.images[0].url;

          // Add variant images to the images array
          allImages.push(
            ...variantWithImages.images.map((img) => getFileUrl(img.url))
          );
        }
      }

      // Calculate average rating
      const avgRating =
        product.reviews.length > 0
          ? (
            product.reviews.reduce((sum, review) => sum + review.rating, 0) /
            product.reviews.length
          ).toFixed(1)
          : 0;

      // Get price from first available variant
      const firstVariant = product.variants[0];
      const price = firstVariant?.salePrice || firstVariant?.price || 0;
      const regularPrice = firstVariant?.price || 0;
      const hasSale =
        firstVariant?.salePrice &&
        firstVariant?.salePrice < firstVariant?.price;

      // Get flash sale data
      const flashSale = flashSaleMap[product.id] || null;
      let flashSalePrice = null;
      if (flashSale && price > 0) {
        const discountAmount = (parseFloat(price) * flashSale.discountPercentage) / 100;
        flashSalePrice = Math.round((parseFloat(price) - discountAmount) * 100) / 100;
      }

      return {
        id: item.id,
        productId: product.id,
        name: product.name,
        description: product.description,
        price: price,
        regularPrice: regularPrice,
        hasSale: hasSale,
        flashSale: flashSale ? { ...flashSale, flashSalePrice } : null,
        image: primaryImageUrl ? getFileUrl(primaryImageUrl) : null,
        images: allImages,
        slug: product.slug,
        featured: product.featured,
        avgRating: parseFloat(avgRating),
        reviewCount: product._count.reviews,
        flavors: product._count.variants,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          salePrice: variant.salePrice,
          // Extract all attributes dynamically
          attributes: (() => {
            if (!variant.attributes) return {};
            const attributesMap = {};
            variant.attributes.forEach((vav) => {
              const attrName = vav.attributeValue?.attribute?.name;
              const attrValue = vav.attributeValue?.value;
              const hexCode = vav.attributeValue?.hexCode;
              const image = vav.attributeValue?.image;
              if (attrName && attrValue) {
                attributesMap[attrName] = {
                  id: vav.attributeValue.id,
                  name: attrValue,
                  value: attrValue,
                  hexCode: hexCode || null,
                  image: image || null,
                };
              }
            });
            return attributesMap;
          })(),
          // Backward compatibility - keep color and size for existing code
          color: (() => {
            const colorAttr = variant.attributes?.find(
              (attr) => attr.attributeValue?.attribute?.name === "Color"
            );
            return colorAttr
              ? {
                id: colorAttr.attributeValue.id,
                name: colorAttr.attributeValue.value,
                hexCode: colorAttr.attributeValue.hexCode || null,
                image: colorAttr.attributeValue.image || null,
              }
              : null;
          })(),
          size: (() => {
            const sizeAttr = variant.attributes?.find(
              (attr) => attr.attributeValue?.attribute?.name === "Size"
            );
            return sizeAttr
              ? {
                id: sizeAttr.attributeValue.id,
                name: sizeAttr.attributeValue.value,
                description: null,
              }
              : null;
          })(),
          images: variant.images
            ? variant.images.map((img) => ({
              ...img,
              url: getFileUrl(img.url),
            }))
            : [],
        })),
        createdAt: item.createdAt,
      };
    });

    res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          { wishlistItems: formattedItems },
          "Wishlist fetched successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    next(new ApiError(500, "Failed to fetch wishlist"));
  }
});

// Get user's orders with pagination
export const getUserOrders = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get total orders count for pagination
  const totalOrders = await prisma.order.count({
    where: { userId: req.user.id },
  });

  // Get paginated orders
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          variant: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
              images: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      },
      tracking: true,
      razorpayPayment: {
        select: {
          paymentMethod: true,
          status: true,
          razorpayPaymentId: true,
        },
      },
      coupon: {
        select: {
          code: true,
          discountType: true,
          discountValue: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: parseInt(limit),
  });

  const formattedOrders = orders.map((order) => {
    // Calculate derived price fields if needed
    // Ensure specific fields are numbers for the frontend
    const formatDecimal = (val) => parseFloat(val || 0);

    return {
      ...order,
      subTotal: formatDecimal(order.subTotal),
      discount: formatDecimal(order.discount),
      shippingCost: formatDecimal(order.shippingCost),
      tax: formatDecimal(order.tax),
      total: formatDecimal(order.total),
      items: order.items.map((item) => ({
        ...item,
        price: formatDecimal(item.price),
        subtotal: formatDecimal(item.subtotal),
        variant: item.variant
          ? {
            ...item.variant,
            // Map attributes to simple key-value pairs for easier frontend consumption
            // This fixes "Undefined" or missing info in UI
            options: item.variant.attributes?.map(attr => ({
              name: attr.attributeValue.attribute.name,
              value: attr.attributeValue.value,
              hexCode: attr.attributeValue.hexCode
            })) || [],
            // Keep legacy attributes map for backward compatibility
            attributes: (() => {
              if (!item.variant.attributes) return {};
              const attributesMap = {};
              item.variant.attributes.forEach((vav) => {
                const attrName = vav.attributeValue?.attribute?.name;
                const attrValue = vav.attributeValue?.value;
                const hexCode = vav.attributeValue?.hexCode;
                if (attrName && attrValue) {
                  attributesMap[attrName] = {
                    value: attrValue,
                    hexCode: hexCode || null,
                  };
                }
              });
              return attributesMap;
            })(),
          }
          : null,
      })),
      razorpayPayment: order.razorpayPayment ? {
        ...order.razorpayPayment,
        amount: formatDecimal(order.razorpayPayment.amount)
      } : null
    };
  });

  res.status(200).json(
    new ApiResponsive(
      200,
      {
        orders: formattedOrders,
        pagination: {
          total: totalOrders,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalOrders / parseInt(limit)),
        },
      },
      "Orders fetched successfully"
    )
  );
});

// Get order details
export const getOrderDetails = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;

  // Get order with full details
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: req.user.id,
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              images: true,
            },
          },
          variant: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: {
                      attribute: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      tracking: {
        include: {
          updates: true,
        },
      },
      razorpayPayment: true,
      shippingAddress: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Format order for frontend
  const formattedOrder = {
    ...order,
    subTotal: parseFloat(order.subTotal),
    tax: parseFloat(order.tax),
    shippingCost: parseFloat(order.shippingCost),
    discount: parseFloat(order.discount),
    total: parseFloat(order.total),
    razorpayPayment: order.razorpayPayment ? {
      ...order.razorpayPayment,
      amount: parseFloat(order.razorpayPayment.amount)
    } : null,
    items: order.items.map(item => ({
      ...item,
      price: parseFloat(item.price),
      subtotal: parseFloat(item.subtotal),
      variant: item.variant ? {
        ...item.variant,
        // Map attributes for consistent UI
        options: item.variant.attributes?.map(attr => ({
          name: attr.attributeValue.attribute.name,
          value: attr.attributeValue.value,
          hexCode: attr.attributeValue.hexCode
        })) || []
      } : null
    }))
  };

  res
    .status(200)
    .json(
      new ApiResponsive(200, { order: formattedOrder }, "Order details fetched successfully")
    );
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  // Find order
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId: req.user.id,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Check if order can be cancelled
  if (order.status !== "PENDING" && order.status !== "PROCESSING") {
    throw new ApiError(400, "This order cannot be cancelled");
  }

  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelReason: reason,
      cancelledAt: new Date(),
      cancelledBy: req.user.id,
    },
  });

  // TODO: Handle inventory restock and payment refund logic

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { order: updatedOrder },
        "Order cancelled successfully"
      )
    );
});

// Request account deletion
export const requestAccountDeletion = asyncHandler(async (req, res, next) => {
  // Generate deletion token (JWT, no DB storage required)
  const deletionToken = jwt.sign(
    { id: req.user.id, purpose: "delete" },
    process.env.ACCOUNT_DELETE_SECRET || process.env.ACCESS_JWT_SECRET,
    { expiresIn: "24h" }
  );

  // Send account deletion confirmation email
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { email: true, name: true },
  });

  const deletionLink = `${process.env.FRONTEND_URL}/confirm-account-deletion/${deletionToken}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Confirm Account Deletion - dfixventure",
      html: getDeleteTemplate(deletionLink),
    });

    console.log("Account deletion email sent to:", user.email);
  } catch (error) {
    console.error("Error sending account deletion email:", error);
    // Don't throw error, still return success response
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        {},
        "Account deletion request submitted. Please confirm via the email sent to your registered email address."
      )
    );
});

// Confirm account deletion
export const confirmAccountDeletion = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    throw new ApiError(400, "Deletion token is required");
  }

  // Verify deletion JWT token
  let decoded;
  try {
    decoded = jwt.verify(
      token,
      process.env.ACCOUNT_DELETE_SECRET || process.env.ACCESS_JWT_SECRET
    );
  } catch (e) {
    throw new ApiError(400, "Invalid or expired deletion token");
  }

  if (!decoded || decoded.purpose !== "delete") {
    throw new ApiError(400, "Invalid or expired deletion token");
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete user's data
  // Start a transaction to handle cascading deletes
  await prisma.$transaction(async (tx) => {
    // Delete addresses, orders, reviews, etc. if not handled by cascade

    // Delete the profile image if exists
    if (user.profileImage) {
      await deleteFromS3(user.profileImage);
    }

    // Delete user
    await tx.user.delete({
      where: { id: user.id },
    });
  });

  // Clear cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Account deleted successfully"));
});

// Get user reviews
export const getUserReviews = asyncHandler(async (req, res, next) => {
  const reviews = await prisma.review.findMany({
    where: { userId: req.user.id },
    include: {
      product: {
        include: {
          images: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, { reviews }, "Reviews fetched successfully"));
});

// Add review
export const addReview = asyncHandler(async (req, res, next) => {
  const { productId, rating, title, comment } = req.body;

  // Validate required fields
  if (!productId || !rating) {
    throw new ApiError(400, "Product ID and rating are required");
  }

  // Check if product exists
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Check if user has already reviewed this product
  const existingReview = await prisma.review.findFirst({
    where: {
      userId: req.user.id,
      productId,
    },
  });

  if (existingReview) {
    throw new ApiError(409, "You have already reviewed this product");
  }

  // Check if user has purchased the product
  const hasPurchased = await prisma.orderItem.findFirst({
    where: {
      order: {
        userId: req.user.id,
        status: {
          in: ["DELIVERED", "SHIPPED"],
        },
      },
      productId,
    },
  });

  if (!hasPurchased) {
    throw new ApiError(403, "You can only review products you have purchased");
  }

  // Add review
  const review = await prisma.review.create({
    data: {
      userId: req.user.id,
      productId,
      rating,
      title,
      comment,
      status: "PENDING", // Reviews need approval before display
    },
  });

  res
    .status(201)
    .json(new ApiResponsive(201, { review }, "Review submitted successfully"));
});

// Update review
export const updateReview = asyncHandler(async (req, res, next) => {
  const { reviewId } = req.params;
  const { rating, title, comment } = req.body;

  // Check if review exists and belongs to user
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      userId: req.user.id,
    },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Update review
  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(rating !== undefined && { rating }),
      ...(title !== undefined && { title }),
      ...(comment !== undefined && { comment }),
      status: "PENDING", // Reset to pending when updated
      updatedAt: new Date(),
    },
  });

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        { review: updatedReview },
        "Review updated successfully"
      )
    );
});

// Delete review
export const deleteReview = asyncHandler(async (req, res, next) => {
  const { reviewId } = req.params;

  // Check if review exists and belongs to user
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      userId: req.user.id,
    },
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Delete review
  await prisma.review.delete({
    where: { id: reviewId },
  });

  res
    .status(200)
    .json(new ApiResponsive(200, {}, "Review deleted successfully"));
});

// Resend verification email
export const resendVerificationEmail = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // For security reasons, always return success even if user doesn't exist
    return res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "If your email is registered, you will receive a verification email"
        )
      );
  }

  // If user is already verified, no need to send email
  if (user.otpVerified) {
    return res
      .status(200)
      .json(
        new ApiResponsive(
          200,
          {},
          "If your email is registered, you will receive a verification email"
        )
      );
  }

  // Generate new OTP
  const otpCode = generateOTP();
  const otpExpiry = new Date();
  otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

  // Update user with new OTP
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otp: otpCode,
      otpVerified: false,
      otpVerifiedExpiry: otpExpiry,
    },
  });

  // Send OTP email
  try {
    await sendEmail({
      email,
      subject: "Your OTP for Email Verification - dfixventure",
      html: getEmailOtpTemplate(otpCode, 10),
    });

    // Log only recipient email — do NOT log the OTP code
    console.log("Verification OTP resent to:", email);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new ApiError(500, "Failed to send OTP email. Please try again later.");
  }

  res
    .status(200)
    .json(
      new ApiResponsive(
        200,
        {},
        "OTP has been sent to your email address"
      )
    );
});
