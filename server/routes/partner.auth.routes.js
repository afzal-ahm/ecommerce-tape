import express from 'express';
import {
    partnerLogin,
    changePartnerPassword,
    forgotPartnerPassword,
    resetPartnerPassword
} from '../controllers/partner.auth.controller.js';
import { verifyPartnerJWT } from '../middlewares/partner.auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/login', partnerLogin);
router.post('/forgot-password', forgotPartnerPassword);
router.post('/reset-password', resetPartnerPassword);

// Protected routes (require partner authentication)
router.post('/change-password', verifyPartnerJWT, changePartnerPassword);

export default router;
