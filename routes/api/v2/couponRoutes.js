import express from "express";
import { authenticate, authorize } from "../../../middlewares/auth.js";
import * as couponController from "../../../controllers/couponController.js";
import cache from "../../../middlewares/redisCache.js";
import { validate } from '../../../middlewares/validation/validate.js';
import {createCouponSchema, updateCouponSchema} from "../../../middlewares/validation/schemas/couponSchemas.js";
import {createLimiter} from "../../../middlewares/security.js";

const couponRoutes = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       required:
 *         - code
 *         - type
 *         - value
 *         - minAmount
 *         - maxDiscount
 *         - expiresAt
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         code:
 *           type: string
 *           example: "SAVE20"
 *         type:
 *           type: string
 *           enum: [percentage, fixed]
 *           example: "percentage"
 *         value:
 *           type: number
 *           example: 20
 *         minAmount:
 *           type: number
 *           example: 100
 *         maxDiscount:
 *           type: number
 *           example: 500
 *         usageLimit:
 *           type: number
 *           example: 100
 *         isActive:
 *           type: boolean
 *           default: true
 *           example: true
 *         createdBy:
 *           type: string
 *           description: Seller or admin who created the coupon
 *           example: "507f1f77bcf86cd799439012"
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-31T23:59:59.000Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /coupons:
 *   post:
 *     summary: Create a new coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Coupon'
 *     responses:
 *       201:
 *         description: Coupon created
 *       401:
 *         description: Unauthorized
 */
couponRoutes.post("/", createLimiter(15, 100), authenticate, authorize(["admin", "seller"]), validate(createCouponSchema), couponController.createCoupon);

/**
 * @swagger
 * /coupons/seller:
 *   get:
 *     summary: Get seller coupons
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of seller coupons
 *       401:
 *         description: Unauthorized
 */
if (process.env.NODE_ENV !== "test") {
    couponRoutes.get("/seller", createLimiter(15, 100), authenticate, cache('couponsSeller', 600), couponController.getCouponsSeller);
} else {
    couponRoutes.get("/seller", createLimiter(15, 100), authenticate, couponController.getCouponsSeller);
}


/**
 * @swagger
 * /coupons:
 *   get:
 *     summary: Get all coupons with pagination (admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [percentage, fixed]
 *         description: Filter by coupon type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 15
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Coupons retrieved successfully with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Coupons retrieved successfully"
 *                 currentPage:
 *                   type: number
 *                   example: 1
 *                 totalPages:
 *                   type: number
 *                   example: 3
 *                 totalCoupon:
 *                   type: number
 *                   example: 45
 *                 coupons:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Coupon'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
couponRoutes.get("/", createLimiter(15, 100), authenticate, cache('coupons', 600), authorize(["admin"]), couponController.getAllCoupons);

/**
 * @swagger
 * /coupons/{id}:
 *   get:
 *     summary: Get coupon by ID
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon found
 *       404:
 *         description: Coupon not found
 */
couponRoutes.get("/:id", createLimiter(15, 100), authenticate, cache('coupon', 600), couponController.getCouponById);

/**
 * @swagger
 * /coupons/{id}:
 *   delete:
 *     summary: Delete coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon deleted
 *       404:
 *         description: Coupon not found
 */
couponRoutes.delete("/:id", createLimiter(15, 100), authenticate, authorize(["admin", "seller"]), couponController.deleteCoupon);

/**
 * @swagger
 * /coupons/{id}:
 *   put:
 *     summary: Update coupon
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Coupon'
 *     responses:
 *       200:
 *         description: Coupon updated
 *       404:
 *         description: Coupon not found
 */
couponRoutes.put("/:id", createLimiter(15, 100), authenticate, authorize(["admin", "seller"]), validate(updateCouponSchema), couponController.updateCoupon);

export default couponRoutes;