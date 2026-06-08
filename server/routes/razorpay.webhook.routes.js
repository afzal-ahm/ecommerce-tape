import express from "express";
import { handleRazorpayWebhook } from "../controllers/razorpay.webhook.controller.js";

const router = express.Router();

// Webhook route (public, but signature verified in controller)
router.post("/", handleRazorpayWebhook);

export default router;
