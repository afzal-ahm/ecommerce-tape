import { Router } from "express";
import {
  getAllFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  getFaqById,
  bulkUpdateFaqOrder,
  getFaqCategories,
} from "../controllers/faq.controller.js";
import { verifyAdminJWT } from "../middlewares/admin.middleware.js";

const router = Router();

// All admin FAQ routes are protected
router.use(verifyAdminJWT);

router.get("/", getAllFaqs);
router.post("/", createFaq);
router.get("/categories", getFaqCategories);
router.put("/bulk-update-order", bulkUpdateFaqOrder);
router.get("/:id", getFaqById);
router.put("/:id", updateFaq);
router.delete("/:id", deleteFaq);

export default router;
