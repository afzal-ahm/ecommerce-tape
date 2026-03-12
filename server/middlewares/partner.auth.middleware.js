import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { ApiResponsive } from '../utils/ApiResponsive.js';

export const verifyPartnerJWT = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json(new ApiResponsive(401, null, 'Access token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find partner - handle both 'partnerId' and 'id' from different controllers
        const partnerId = decoded.partnerId || decoded.id;

        if (!partnerId) {
            console.log('No partner ID found in token:', decoded);
            return res.status(401).json(new ApiResponsive(401, null, 'Invalid token format'));
        }

        const partner = await prisma.partner.findUnique({
            where: {
                id: partnerId,
                isActive: true
            }
        });

        if (!partner) {
            return res.status(404).json(new ApiResponsive(404, null, 'Partner not found'));
        }

        // Remove password from partner object
        const { password, ...partnerData } = partner;
        req.partner = partnerData;

        next();
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json(new ApiResponsive(401, null, 'Invalid token'));
    }
};
