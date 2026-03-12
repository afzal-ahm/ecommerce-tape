import { ApiError } from "../utils/ApiError.js";
import { ApiResponsive } from "../utils/ApiResponsive.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";
import { encrypt, decrypt, maskSecret } from "../utils/encryption.js";

// Helper function to get or create User for admin
async function getOrCreateUserForAdmin(admin, userId = null) {
    // If super admin and userId provided (and it's not the admin's own ID), use that
    if (admin?.role === "SUPER_ADMIN" && userId && userId !== admin.id) {
        // Verify user exists in User table
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        return userId;
    }

    // For all admins (including SUPER_ADMIN using their own ID), find or create User based on admin email
    // This is because PaymentGatewaySetting requires a User, not Admin
    let user = await prisma.user.findUnique({
        where: { email: admin.email },
    });

    if (!user) {
        // Create a User record for this admin if it doesn't exist
        user = await prisma.user.create({
            data: {
                email: admin.email,
                name: `${admin.firstName} ${admin.lastName}`.trim() || admin.email,
                role: "CUSTOMER",
                isActive: true,
            },
        });
    }

    return user.id;
}

// Get Payment Gateway Settings for a user
export const getPaymentGatewaySettings = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const admin = req.admin;

    if (!admin) {
        throw new ApiError(403, "Unauthorized");
    }

    try {
        const targetUserId = await getOrCreateUserForAdmin(admin, userId);

        const settings = await prisma.paymentGatewaySetting.findMany({
            where: {
                userId: targetUserId,
            },
            orderBy: {
                gateway: "asc",
            },
        });

        // Mask secrets before sending to frontend
        const maskedSettings = settings.map((setting) => {
            const masked = { ...setting };

            // Safely decrypt and mask secrets
            try {
                if (setting.razorpayKeySecret) {
                    masked.razorpayKeySecret = maskSecret(decrypt(setting.razorpayKeySecret));
                } else {
                    masked.razorpayKeySecret = null;
                }
            } catch (error) {
                console.error("Error decrypting razorpayKeySecret:", error);
                masked.razorpayKeySecret = null;
            }

            try {
                if (setting.razorpayWebhookSecret) {
                    masked.razorpayWebhookSecret = maskSecret(decrypt(setting.razorpayWebhookSecret));
                } else {
                    masked.razorpayWebhookSecret = null;
                }
            } catch (error) {
                console.error("Error decrypting razorpayWebhookSecret:", error);
                masked.razorpayWebhookSecret = null;
            }

            try {
                if (setting.phonepeSaltKey) {
                    masked.phonepeSaltKey = maskSecret(decrypt(setting.phonepeSaltKey));
                } else {
                    masked.phonepeSaltKey = null;
                }
            } catch (error) {
                console.error("Error decrypting phonepeSaltKey:", error);
                masked.phonepeSaltKey = null;
            }

            return masked;
        });

        return res
            .status(200)
            .json(
                new ApiResponsive(200, maskedSettings, "Payment gateway settings retrieved")
            );
    } catch (error) {
        console.error("Error in getPaymentGatewaySettings:", error);
        throw error;
    }
});

// Get specific gateway setting
export const getPaymentGatewaySetting = asyncHandler(async (req, res, next) => {
    const { userId, gateway } = req.params;
    const admin = req.admin;

    if (!admin) {
        throw new ApiError(403, "Unauthorized");
    }

    const targetUserId = await getOrCreateUserForAdmin(admin, userId);

    const setting = await prisma.paymentGatewaySetting.findUnique({
        where: {
            userId_gateway: {
                userId: targetUserId,
                gateway: gateway.toUpperCase(),
            },
        },
    });

    if (!setting) {
        return res.status(200).json(
            new ApiResponsive(200, null, "Payment gateway setting not found")
        );
    }

    // Mask secrets safely
    const maskedSetting = { ...setting };

    try {
        maskedSetting.razorpayKeySecret = setting.razorpayKeySecret
            ? maskSecret(decrypt(setting.razorpayKeySecret))
            : null;
    } catch (error) {
        console.error("Error decrypting razorpayKeySecret:", error);
        maskedSetting.razorpayKeySecret = null;
    }

    try {
        maskedSetting.razorpayWebhookSecret = setting.razorpayWebhookSecret
            ? maskSecret(decrypt(setting.razorpayWebhookSecret))
            : null;
    } catch (error) {
        console.error("Error decrypting razorpayWebhookSecret:", error);
        maskedSetting.razorpayWebhookSecret = null;
    }

    try {
        maskedSetting.phonepeSaltKey = setting.phonepeSaltKey
            ? maskSecret(decrypt(setting.phonepeSaltKey))
            : null;
    } catch (error) {
        console.error("Error decrypting phonepeSaltKey:", error);
        maskedSetting.phonepeSaltKey = null;
    }

    return res
        .status(200)
        .json(
            new ApiResponsive(200, maskedSetting, "Payment gateway setting retrieved")
        );
});

// Create or Update Payment Gateway Setting
export const upsertPaymentGatewaySetting = asyncHandler(async (req, res, next) => {
    const { userId } = req.params;
    const {
        gateway,
        isActive,
        mode,
        // Razorpay
        razorpayKeyId,
        razorpayKeySecret,
        razorpayWebhookSecret,
        // PhonePe
        phonepeMerchantId,
        phonepeSaltKey,
        phonepeSaltIndex,
    } = req.body;

    const admin = req.admin;

    if (!admin) {
        throw new ApiError(403, "Unauthorized");
    }

    const targetUserId = await getOrCreateUserForAdmin(admin, userId);

    if (!gateway || !["RAZORPAY", "PHONEPE"].includes(gateway.toUpperCase())) {
        throw new ApiError(400, "Invalid gateway. Must be RAZORPAY or PHONEPE");
    }

    const gatewayUpper = gateway.toUpperCase();

    // Validate gateway-specific fields
    if (gatewayUpper === "RAZORPAY") {
        if (isActive && (!razorpayKeyId || !razorpayKeySecret)) {
            throw new ApiError(400, "Razorpay Key ID and Key Secret are required");
        }
    } else if (gatewayUpper === "PHONEPE") {
        if (isActive && (!phonepeMerchantId || !phonepeSaltKey || !phonepeSaltIndex)) {
            throw new ApiError(
                400,
                "PhonePe Merchant ID, Salt Key, and Salt Index are required"
            );
        }
    }

    // Check if setting exists
    const existing = await prisma.paymentGatewaySetting.findUnique({
        where: {
            userId_gateway: {
                userId: targetUserId,
                gateway: gatewayUpper,
            },
        },
    });

    // Prepare data
    const data = {
        userId: targetUserId,
        gateway: gatewayUpper,
        isActive: isActive ?? true,
        mode: mode || "TEST",
    };

    // Encrypt secrets before storing
    if (razorpayKeySecret) {
        // Only encrypt if it's not already masked (contains ****)
        if (!razorpayKeySecret.includes("****")) {
            data.razorpayKeySecret = encrypt(razorpayKeySecret);
        } else if (existing) {
            // Keep existing encrypted value if masked
            data.razorpayKeySecret = existing.razorpayKeySecret;
        }
    }

    if (razorpayWebhookSecret) {
        if (!razorpayWebhookSecret.includes("****")) {
            data.razorpayWebhookSecret = encrypt(razorpayWebhookSecret);
        } else if (existing) {
            data.razorpayWebhookSecret = existing.razorpayWebhookSecret;
        }
    }

    if (phonepeSaltKey) {
        if (!phonepeSaltKey.includes("****")) {
            data.phonepeSaltKey = encrypt(phonepeSaltKey);
        } else if (existing) {
            data.phonepeSaltKey = existing.phonepeSaltKey;
        }
    }

    // Add non-secret fields
    if (razorpayKeyId) data.razorpayKeyId = razorpayKeyId;
    if (phonepeMerchantId) data.phonepeMerchantId = phonepeMerchantId;
    if (phonepeSaltIndex) data.phonepeSaltIndex = phonepeSaltIndex;

    let setting;
    if (existing) {
        setting = await prisma.paymentGatewaySetting.update({
            where: { id: existing.id },
            data,
        });
    } else {
        setting = await prisma.paymentGatewaySetting.create({
            data,
        });
    }

    // Update global PaymentSettings to ensures consistency for CheckoutPage
    // This fixes the issue where keys are added but the global toggle remains false
    if (gatewayUpper === "RAZORPAY") {
        const globalSettings = await prisma.paymentSettings.findFirst();
        if (globalSettings) {
            await prisma.paymentSettings.update({
                where: { id: globalSettings.id },
                data: {
                    razorpayEnabled: isActive ?? true,
                    updatedBy: admin.id
                }
            });
        } else {
            await prisma.paymentSettings.create({
                data: {
                    razorpayEnabled: isActive ?? true,
                    cashEnabled: true,
                    updatedBy: admin.id
                }
            });
        }
    }

    // Return masked version safely
    const maskedSetting = { ...setting };

    try {
        maskedSetting.razorpayKeySecret = setting.razorpayKeySecret
            ? maskSecret(decrypt(setting.razorpayKeySecret))
            : null;
    } catch (error) {
        console.error("Error decrypting razorpayKeySecret:", error);
        maskedSetting.razorpayKeySecret = null;
    }

    try {
        maskedSetting.razorpayWebhookSecret = setting.razorpayWebhookSecret
            ? maskSecret(decrypt(setting.razorpayWebhookSecret))
            : null;
    } catch (error) {
        console.error("Error decrypting razorpayWebhookSecret:", error);
        maskedSetting.razorpayWebhookSecret = null;
    }

    try {
        maskedSetting.phonepeSaltKey = setting.phonepeSaltKey
            ? maskSecret(decrypt(setting.phonepeSaltKey))
            : null;
    } catch (error) {
        console.error("Error decrypting phonepeSaltKey:", error);
        maskedSetting.phonepeSaltKey = null;
    }

    return res.status(200).json(
        new ApiResponsive(
            200,
            maskedSetting,
            existing ? "Payment gateway setting updated" : "Payment gateway setting created"
        )
    );
});

// Delete Payment Gateway Setting
export const deletePaymentGatewaySetting = asyncHandler(async (req, res, next) => {
    const { userId, gateway } = req.params;
    const admin = req.admin;

    if (!admin) {
        throw new ApiError(403, "Unauthorized");
    }

    const targetUserId = await getOrCreateUserForAdmin(admin, userId);

    const setting = await prisma.paymentGatewaySetting.findUnique({
        where: {
            userId_gateway: {
                userId: targetUserId,
                gateway: gateway.toUpperCase(),
            },
        },
    });

    if (setting) {
        await prisma.paymentGatewaySetting.delete({
            where: { id: setting.id },
        });
    }

    return res
        .status(200)
        .json(new ApiResponsive(200, null, "Payment gateway setting deleted"));
});

// Get decrypted keys for payment processing (internal use only)
export const getDecryptedPaymentKeys = asyncHandler(async (req, res, next) => {
    const { userId, gateway } = req.params;

    const setting = await prisma.paymentGatewaySetting.findUnique({
        where: {
            userId_gateway: {
                userId,
                gateway: gateway.toUpperCase(),
            },
        },
    });

    if (!setting || !setting.isActive) {
        throw new ApiError(404, "Active payment gateway setting not found");
    }

    // Decrypt and return keys (only for internal backend use)
    const decrypted = {
        gateway: setting.gateway,
        mode: setting.mode,
        razorpayKeyId: setting.razorpayKeyId,
        razorpayKeySecret: setting.razorpayKeySecret
            ? decrypt(setting.razorpayKeySecret)
            : null,
        razorpayWebhookSecret: setting.razorpayWebhookSecret
            ? decrypt(setting.razorpayWebhookSecret)
            : null,
        phonepeMerchantId: setting.phonepeMerchantId,
        phonepeSaltKey: setting.phonepeSaltKey ? decrypt(setting.phonepeSaltKey) : null,
        phonepeSaltIndex: setting.phonepeSaltIndex,
    };

    return res
        .status(200)
        .json(new ApiResponsive(200, decrypted, "Decrypted payment keys retrieved"));
});

