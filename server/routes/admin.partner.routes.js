import express from 'express';
import {
    listPartnerRequests,
    approvePartnerRequest,
    rejectPartnerRequest,
    getPartnerDetails,
    removePartnerCoupon,
    createManualCommission,
    createCommissionsForExistingOrders,
    deactivatePartner,
    getPartnerById,
    markPaymentAsPaid,
    getPartnerEarnings
} from '../controllers/admin.partner.controller.js';
import { verifyAdminJWT } from '../middlewares/admin.middleware.js';


const router = express.Router();


// List all partner requests
router.get('/requests', verifyAdminJWT, listPartnerRequests);
// Approve a partner request (set password)
router.post('/requests/:requestId/approve', verifyAdminJWT, approvePartnerRequest);
// Reject a partner request
router.post('/requests/:requestId/reject', verifyAdminJWT, rejectPartnerRequest);

// Get partner by ID with detailed earnings (admin only)
router.get('/:partnerId', verifyAdminJWT, getPartnerById);
// Get full partner details (admin only)
router.get('/:partnerId/details', verifyAdminJWT, getPartnerDetails);
// Get partner earnings with filters (admin only)
router.get('/:partnerId/earnings', verifyAdminJWT, getPartnerEarnings);
// Mark payment as paid (admin only)
router.patch('/earnings/:earningId/mark-paid', verifyAdminJWT, markPaymentAsPaid);
// Remove a coupon from a partner (admin only)
router.delete('/:partnerId/coupons/:couponId', verifyAdminJWT, removePartnerCoupon);
// Deactivate a partner (admin only)
router.post('/:partnerId/deactivate', verifyAdminJWT, deactivatePartner);
// Create manual commission for testing (admin only)
router.post('/commission/create', verifyAdminJWT, createManualCommission);
// Create commissions for existing orders (one-time fix)
router.post('/commission/fix-existing', verifyAdminJWT, createCommissionsForExistingOrders);

export default router;
