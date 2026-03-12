import express from "express";
import { uploadFiles } from "../middlewares/multer.middlerware.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";

import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getAllBlogPosts,
  getBlogPostById,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getAllBlogCategories,
  updatePageContent,
  getPageContent,
  getAllPageContents,
  createFaq,
  updateFaq,
  deleteFaq,
  getAllFaqs,
  getContactSubmissions,
  getContactSubmissionById,
  updateContactSubmission,
  deleteContactSubmission,
} from "../controllers/admin.content.controller.js";

const router = express.Router();

// Blog Posts
router.post(
  "/blog",
  verifyAdminJWT,
  hasPermission("content", "create"),
  uploadFiles.single("coverImage"),
  createBlogPost
);

router.put(
  "/blog/:id",
  verifyAdminJWT,
  hasPermission("content", "update"),
  uploadFiles.single("coverImage"),
  updateBlogPost
);

router.delete(
  "/blog/:id",
  verifyAdminJWT,
  hasPermission("content", "delete"),
  deleteBlogPost
);

router.get(
  "/blog",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllBlogPosts
);

router.get(
  "/blog/:id",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getBlogPostById
);

// Blog Categories
router.post(
  "/blog-categories",
  verifyAdminJWT,
  hasPermission("content", "create"),
  createBlogCategory
);

router.put(
  "/blog-categories/:id",
  verifyAdminJWT,
  hasPermission("content", "update"),
  updateBlogCategory
);

router.delete(
  "/blog-categories/:id",
  verifyAdminJWT,
  hasPermission("content", "delete"),
  deleteBlogCategory
);

router.get(
  "/blog-categories",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllBlogCategories
);

// Page Contents (about, shipping policy, etc.)
router.put(
  "/pages/:slug",
  verifyAdminJWT,
  hasPermission("content", "update"),
  updatePageContent
);

router.get(
  "/pages/:slug",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getPageContent
);

router.get(
  "/pages",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllPageContents
);

// FAQs
router.post(
  "/faqs",
  verifyAdminJWT,
  hasPermission("content", "create"),
  createFaq
);

router.put(
  "/faqs/:id",
  verifyAdminJWT,
  hasPermission("content", "update"),
  updateFaq
);

router.delete(
  "/faqs/:id",
  verifyAdminJWT,
  hasPermission("content", "delete"),
  deleteFaq
);

router.get(
  "/faqs",
  verifyAdminJWT,
  hasPermission("content", "read"),
  getAllFaqs
);

// Contact Submissions
router.get(
  "/contact",
  verifyAdminJWT,
  hasPermission("contact", "read"),
  getContactSubmissions
);

router.get(
  "/contact/:id",
  verifyAdminJWT,
  hasPermission("contact", "read"),
  getContactSubmissionById
);

router.put(
  "/contact/:id/status",
  verifyAdminJWT,
  hasPermission("contact", "update"),
  updateContactSubmission
);

router.delete(
  "/contact/:id",
  verifyAdminJWT,
  hasPermission("contact", "delete"),
  deleteContactSubmission
);

export default router;
