import express from "express";
import {
  getBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  togglePublishBanner,
} from "../controllers/admin.banner.controller.js";
import {
  verifyAdminJWT,
  hasPermission,
} from "../middlewares/admin.middleware.js";
import { uploadFiles } from "../middlewares/multer.middlerware.js";

const router = express.Router();

// Banner routes (admin)
router.get(
  "/banners",
  verifyAdminJWT,
  hasPermission("banners", "read"),
  getBanners
);

router.get(
  "/banners/:bannerId",
  verifyAdminJWT,
  hasPermission("banners", "read"),
  getBannerById
);

router.post(
  "/banners",
  verifyAdminJWT,
  hasPermission("banners", "create"),
  uploadFiles.fields([
    { name: "desktopImage", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  createBanner
);

router.put(
  "/banners/:bannerId",
  verifyAdminJWT,
  hasPermission("banners", "update"),
  uploadFiles.fields([
    { name: "desktopImage", maxCount: 1 },
    { name: "mobileImage", maxCount: 1 },
  ]),
  updateBanner
);

router.delete(
  "/banners/:bannerId",
  verifyAdminJWT,
  hasPermission("banners", "delete"),
  deleteBanner
);

router.patch(
  "/banners/:bannerId/publish",
  verifyAdminJWT,
  hasPermission("banners", "update"),
  togglePublishBanner
);

export default router;
