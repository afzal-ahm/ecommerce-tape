import express from "express";
import {
  getAllReferrals,
  getReferralStats,
  getReferralById,
  updateReferralStatus,
} from "../controllers/admin.referral.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminJWT);

// Get all referrals
router.get(
  "/",
  hasPermission("users", "read"),
  getAllReferrals
);

// Get referral statistics
router.get(
  "/stats",
  hasPermission("users", "read"),
  getReferralStats
);

// Get referral by ID
router.get(
  "/:referralId",
  hasPermission("users", "read"),
  getReferralById
);

// Update referral status
router.patch(
  "/:referralId",
  hasPermission("users", "update"),
  updateReferralStatus
);

export default router;






