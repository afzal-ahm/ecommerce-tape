import express from "express";
import {
  getReviews,
  getReviewById,
  updateReview,
  deleteReview,
  replyToReview,
  getReviewStats,
} from "../controllers/admin.review.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

const router = express.Router();

// Admin Review Management Routes
// GET all reviews with pagination and filtering
router.get(
  "/reviews",
  verifyAdminJWT,
  hasPermission("reviews", "read"),
  getReviews
);

// GET review stats for dashboard
router.get(
  "/review-stats",
  verifyAdminJWT,
  hasPermission("reviews", "read"),
  getReviewStats
);

// GET a single review by ID
router.get(
  "/reviews/:reviewId",
  verifyAdminJWT,
  hasPermission("reviews", "read"),
  getReviewById
);

// UPDATE a review - change status, add admin comment
router.patch(
  "/reviews/:reviewId",
  verifyAdminJWT,
  hasPermission("reviews", "update"),
  updateReview
);

// DELETE a review
router.delete(
  "/reviews/:reviewId",
  verifyAdminJWT,
  hasPermission("reviews", "delete"),
  deleteReview
);

// POST a reply to a review
router.post(
  "/reviews/:reviewId/reply",
  verifyAdminJWT,
  hasPermission("reviews", "update"),
  replyToReview
);

export default router;
