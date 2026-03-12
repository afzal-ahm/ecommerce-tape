import express from "express";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import {
  getMyReferralCode,
  getMyReferrals,
  applyReferralCode,
} from "../controllers/referral.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJWTToken);

// Get my referral code and stats
router.get("/my-code", getMyReferralCode);

// Get my referral history
router.get("/my-referrals", getMyReferrals);

// Apply referral code
router.post("/apply", applyReferralCode);

export default router;






