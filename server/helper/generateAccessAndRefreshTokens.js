import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db.js";
import { ApiError } from "../utils/ApiError.js";

const COOKIE_EXPIRY = 7 * 24 * 60 * 60 * 1000;

export const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user.id);

    // Don't try to store the refresh token in the database
    // Since the refreshToken field doesn't exist in the User model
    // We'll rely on HTTP Only cookies for token storage instead

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, error.message || "Error generating tokens");
  }
};

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.ACCESS_JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_LIFE }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_LIFE,
  });
};

export const setCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === "production";

  const cookieOptions = {
    httpOnly: true,
    secure: false, // Set to false in development to work with http
    sameSite: "lax", // Use lax to allow cross-site requests
    path: "/",
    maxAge: COOKIE_EXPIRY, // Use maxAge instead of expires for better browser compatibility
  };

  // Only set these options in production
  if (isProduction) {
    cookieOptions.secure = true;
    cookieOptions.sameSite = "strict";
    if (process.env.COOKIE_DOMAIN) {
      cookieOptions.domain = process.env.COOKIE_DOMAIN;
    }
  }

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  // Also set user data in a non-httpOnly cookie so it's accessible to client JavaScript
  const userData = {
    id: JSON.parse(Buffer.from(accessToken.split(".")[1], "base64").toString())
      .id,
    isAuthenticated: true,
  };

  res.cookie("user_session", JSON.stringify(userData), {
    ...cookieOptions,
    httpOnly: false, // Make accessible to client-side JavaScript
  });
};

export const generateToken = () => crypto.randomBytes(32).toString("hex");
