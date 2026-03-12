import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/db.js";

// Verify admin JWT token
export const verifyAdminJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.adminToken ||
      req.headers?.authorization?.replace("Bearer ", "") ||
      req.query?.adminToken;

    if (!token) {
      throw new ApiError(401, "Admin authentication required");
    }

    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      include: {
        permissions: true,
      },
    });

    if (!admin) {
      throw new ApiError(401, "Invalid token or admin not found");
    }

    if (!admin.isActive) {
      throw new ApiError(403, "Your account has been deactivated");
    }

    // Attach admin data to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      permissions: admin.permissions.map((p) => `${p.resource}:${p.action}`),
    };

    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    if (error.name === "JsonWebTokenError") {
      throw new ApiError(401, "Invalid token");
    } else if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Token expired");
    }
    throw new ApiError(500, `Authentication error: ${error.message}`);
  }
});

// Check if admin has specific permission
export const hasPermission = (resource, action) => {
  return asyncHandler(async (req, res, next) => {
    // Super admins bypass permission checks
    if (req.admin.role === "SUPER_ADMIN") {
      return next();
    }

    const permissionString = `${resource}:${action}`;

    if (!req.admin.permissions.includes(permissionString)) {
      throw new ApiError(403, "Insufficient permissions");
    }

    next();
  });
};

// Check if admin has one of the specified roles
export const hasRole = (roles) => {
  return asyncHandler(async (req, res, next) => {
    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    if (!roles.includes(req.admin.role)) {
      throw new ApiError(403, "Insufficient role permissions");
    }

    next();
  });
};
