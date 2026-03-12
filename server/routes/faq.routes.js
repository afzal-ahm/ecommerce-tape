import { Router } from "express";
import {
  getAllPublishedFaqs,
  getFaqById,
  getFaqCategories,
} from "../controllers/faq.controller.js";

const router = Router();

router.get("/", getAllPublishedFaqs);
router.get("/categories", getFaqCategories);
router.get("/:id", getFaqById);

export default router;
