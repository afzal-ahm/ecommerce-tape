import express from "express";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import { verifyCoupon, applyCoupon } from "../controllers/coupon.controller.js";

const router = express.Router();

// Public route to verify a coupon code without authentication
router.post("/verify", verifyCoupon);

// Protected route to apply a coupon to the user's cart
router.post("/apply", verifyJWTToken, applyCoupon);

export default router;
