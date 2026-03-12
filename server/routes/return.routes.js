import express from "express";
import { verifyJWTToken } from "../middlewares/auth.middleware.js";
import {
  getReturnSettings,
  getReturnReasons,
  createReturnRequest,
  getMyReturnRequests,
  getReturnRequestById,
} from "../controllers/return.controller.js";

const router = express.Router();

// Public routes
router.get("/settings", getReturnSettings);
router.get("/reasons", getReturnReasons);

// Protected routes
router.use(verifyJWTToken);

// Create return request
router.post("/", createReturnRequest);

// Get my return requests
router.get("/my-returns", getMyReturnRequests);

// Get return request by ID
router.get("/:returnId", getReturnRequestById);

export default router;






