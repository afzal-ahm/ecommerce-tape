import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import Razorpay from "razorpay";
import { logger } from "./utils/logger.js";

// Routes
import userRoutes from "./routes/user.routes.js";
import partnerRoutes from "./routes/partner.routes.js";
import partnerAuthRoutes from "./routes/partner.auth.routes.js";
import adminPartnerRoutes from "./routes/admin.partner.routes.js";
import adminPartnerListRoutes from "./routes/admin.partner.list.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import adminProductRoutes from "./routes/admin.product.routes.js";
import adminOrderRoutes from "./routes/admin.order.routes.js";
import adminCategoryRoutes from "./routes/admin.category.routes.js";
import adminAttributeRoutes from "./routes/admin.attribute.routes.js";
import adminAttributeValueRoutes from "./routes/admin.attribute-value.routes.js";
import adminCouponRoutes from "./routes/admin.coupon.routes.js";
import adminContentRoutes from "./routes/admin.content.routes.js";
import adminReviewRoutes from "./routes/admin.review.routes.js";
import adminFaqRoutes from "./routes/admin.faq.routes.js";
import publicRoutes from "./routes/public.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import contentRoutes from "./routes/content.routes.js";
import faqRoutes from "./routes/faq.routes.js";
import adminBrandRoutes from "./routes/admin.brand.routes.js";
import adminBannerRoutes from "./routes/admin.banner.routes.js";
import adminProductSectionRoutes from "./routes/admin.product-section.routes.js";
import adminSubCategoryRoutes from "./routes/admin.subcategory.routes.js";
import adminFlashSaleRoutes from "./routes/admin.flashsale.routes.js";
import referralRoutes from "./routes/referral.routes.js";
import adminReferralRoutes from "./routes/admin.referral.routes.js";
import returnRoutes from "./routes/return.routes.js";
import adminReturnRoutes from "./routes/admin.return.routes.js";
import adminMOQRoutes from "./routes/admin.moq.routes.js";
import adminPaymentGatewayRoutes from "./routes/admin.payment-gateway.routes.js";
import adminShiprocketRoutes from "./routes/admin.shiprocket.routes.js";
import adminParcelXRoutes from "./routes/admin.parcelx.routes.js";

const app = express();

/* -------------------- BASIC MIDDLEWARE -------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* -------------------- REQUEST LOGGER -------------------- */

app.use((req, res, next) => {
  logger(
    "REQUEST",
    `${req.method} ${req.originalUrl}`,
    `IP: ${req.ip}`
  );
  next();
});

/* -------------------- CORS -------------------- */

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : [
    "https://api.dfixkart.com",
    "https://admin.dfixkart.com",
    "http://localhost:3000",
    "https://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3001",
    "http://localhost:5173",
    "http://localhost:4173",
  ];

const corsOptions = {
  origin: (origin, callback) => {
    // Log all incoming origins for debugging
    logger("INFO", "CORS REQUEST", { origin, environment: process.env.NODE_ENV });

    // In development, allow all origins
    if (process.env.NODE_ENV === "development") {
      logger("INFO", "CORS ALLOWED (development mode)", origin);
      return callback(null, true);
    }

    if (!origin) {
      logger("INFO", "CORS ALLOWED (no origin)");
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      logger("INFO", "CORS ALLOWED (in allowed list)", origin);
      callback(null, true);
    } else {
      const error = new Error("Not allowed by CORS");
      logger("ERROR", "CORS BLOCKED", origin);
      logger("ERROR", "Allowed origins", allowedOrigins);
      callback(error);
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
// Ensure preflight responses include the same CORS headers (esp. for credentials)
app.options("*", cors(corsOptions));

/* -------------------- SECURITY HEADERS -------------------- */

app.use((req, res, next) => {
  res.header("Cache-Control", "no-store");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  next();
});

/* -------------------- STATIC -------------------- */

app.use(express.static("public/upload"));

/* -------------------- RAZORPAY -------------------- */

let razorpay = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    logger("SUCCESS", "Razorpay Initialized from ENV");
  } catch (error) {
    logger("ERROR", "Razorpay Init Failed", error);
  }
} else {
  logger("INFO", "Razorpay using DB-based keys");
}

export { razorpay };

/* -------------------- ROUTES -------------------- */

app.use("/api/users", userRoutes);
app.use("/api/partner/auth", partnerAuthRoutes);
app.use("/api/partner", partnerRoutes);
app.use("/api/admin", adminPartnerListRoutes);
app.use("/api/admin/partners", adminPartnerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminProductRoutes);
app.use("/api/admin", adminOrderRoutes);
app.use("/api/admin", adminCategoryRoutes);
app.use("/api/admin", adminAttributeRoutes);
app.use("/api/admin", adminAttributeValueRoutes);
app.use("/api/admin", adminCouponRoutes);
app.use("/api/admin", adminContentRoutes);
app.use("/api/admin", adminReviewRoutes);
app.use("/api/admin/faqs", adminFaqRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/admin", adminBrandRoutes);
app.use("/api/admin", adminBannerRoutes);
app.use("/api/admin", adminProductSectionRoutes);
app.use("/api/admin", adminSubCategoryRoutes);
app.use("/api/admin/flash-sales", adminFlashSaleRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/admin/referrals", adminReferralRoutes);
app.use("/api/returns", returnRoutes);
app.use("/api/admin/returns", adminReturnRoutes);
app.use("/api/admin", adminMOQRoutes);
app.use("/api/admin", adminPaymentGatewayRoutes);
app.use("/api/admin/shiprocket", adminShiprocketRoutes);
app.use("/api/admin/parcelx", adminParcelXRoutes);

import adminVariantRoutes from "./routes/admin.variant.routes.js";
app.use("/api/admin/variants", adminVariantRoutes);

// Shiprocket webhook (public endpoint)
app.use("/api/webhooks/shiprocket", adminShiprocketRoutes);
app.use("/api/webhooks/parcelx", adminParcelXRoutes);

/* -------------------- HEALTH CHECK -------------------- */

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    time: new Date().toISOString(),
  });
});

/* -------------------- ERROR HANDLER -------------------- */

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // Only log unexpected errors (exclude 401 auth errors)
  if (statusCode !== 401) {
    logger("ERROR", err.message, {
      url: req.originalUrl,
      method: req.method,
      stack: err.stack,
    });
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
    data: null,
  });
});

/* -------------------- 404 HANDLER -------------------- */

app.use((req, res) => {
  logger("404", `${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;
