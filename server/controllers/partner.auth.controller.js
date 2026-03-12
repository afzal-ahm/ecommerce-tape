import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponsive } from '../utils/ApiResponsive.js';
import { prisma } from '../config/db.js';
import sendEmail from '../utils/sendEmail.js';
import { getPartnerResetTemplate } from '../email/temp/EmailTemplate.js';

const router = express.Router();

// Partner login
export const partnerLogin = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json(new ApiResponsive(400, null, 'Email and password are required'));
        }

        // Find partner
        const partner = await prisma.partner.findUnique({
            where: { email, isActive: true }
        });

        if (!partner) {
            return res.status(401).json(new ApiResponsive(401, null, 'Invalid credentials'));
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, partner.password);
        if (!isValidPassword) {
            return res.status(401).json(new ApiResponsive(401, null, 'Invalid credentials'));
        }

        // Generate JWT token
        const token = jwt.sign(
            { partnerId: partner.id, email: partner.email },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Remove password from response
        const { password: _, ...partnerData } = partner;

        res.status(200).json(new ApiResponsive(200, {
            partner: partnerData,
            token,
            requiresPasswordChange: !partner.isPasswordChanged
        }, 'Login successful'));
    } catch (error) {
        console.error('Partner login error:', error);
        res.status(500).json(new ApiResponsive(500, null, 'Internal Server Error', error));
    }
});

// Partner password change
export const changePartnerPassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const partnerId = req.partner.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json(new ApiResponsive(400, null, 'Current and new passwords are required'));
    }

    if (newPassword.length < 6) {
        return res.status(400).json(new ApiResponsive(400, null, 'New password must be at least 6 characters'));
    }

    // Find partner
    const partner = await prisma.partner.findUnique({
        where: { id: partnerId }
    });

    if (!partner) {
        return res.status(404).json(new ApiResponsive(404, null, 'Partner not found'));
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, partner.password);
    if (!isValidPassword) {
        return res.status(401).json(new ApiResponsive(401, null, 'Current password is incorrect'));
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.partner.update({
        where: { id: partnerId },
        data: {
            password: hashedNewPassword,
            isPasswordChanged: true
        }
    });

    res.status(200).json(new ApiResponsive(200, null, 'Password changed successfully'));
});

// Partner forgot password (send reset link)
export const forgotPartnerPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json(new ApiResponsive(400, null, 'Email is required'));
    }

    // Find partner
    const partner = await prisma.partner.findUnique({
        where: { email, isActive: true }
    });

    if (!partner) {
        // Don't reveal if email exists for security
        return res.status(200).json(new ApiResponsive(200, null, 'If email exists, reset link has been sent'));
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
        { partnerId: partner.id, email: partner.email, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    // Create reset link
    const resetLink = `${process.env.PARTNER_FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;

    try {
        // Send reset email
        await sendEmail({
            email: partner.email,
            subject: 'Reset Your Partner Password - dfixventure',
            html: getPartnerResetTemplate(resetLink)
        });

        res.status(200).json(new ApiResponsive(200, null, 'Password reset link sent to your email'));
    } catch (error) {
        console.error('Email sending error:', error);

        // For development, return the token so testing can continue
        if (process.env.NODE_ENV !== 'production') {
            return res.status(200).json(new ApiResponsive(200, {
                resetToken,
                resetLink,
                message: 'Email service not configured. Use the reset link below for testing.'
            }, 'Reset link generated (development mode)'));
        }

        return res.status(500).json(new ApiResponsive(500, null, 'Failed to send reset email. Please try again later.'));
    }
});

// Partner reset password with token
export const resetPartnerPassword = asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json(new ApiResponsive(400, null, 'Token and new password are required'));
    }

    if (newPassword.length < 6) {
        return res.status(400).json(new ApiResponsive(400, null, 'Password must be at least 6 characters'));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.type !== 'password_reset') {
            return res.status(400).json(new ApiResponsive(400, null, 'Invalid reset token'));
        }

        // Find partner
        const partner = await prisma.partner.findUnique({
            where: { id: decoded.partnerId, isActive: true }
        });

        if (!partner) {
            return res.status(404).json(new ApiResponsive(404, null, 'Partner not found'));
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.partner.update({
            where: { id: partner.id },
            data: {
                password: hashedPassword,
                isPasswordChanged: true
            }
        });

        res.status(200).json(new ApiResponsive(200, null, 'Password reset successfully'));

    } catch (error) {
        return res.status(400).json(new ApiResponsive(400, null, 'Invalid or expired reset token'));
    }
});

export default router;
