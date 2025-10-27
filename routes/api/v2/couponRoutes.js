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
 *       properties:
 *         _id:
 *           type: string
 *         code:
 *           type: string
 *         type:
 *           type: string
 *           enum: [percentage, fixed]
 *         value:
 *           type: number
 *         minAmount:
 *           type: number
 *         maxDiscount:
 *           type: number
 *         usageLimit:
 *           type: number
 *         isActive:
 *           type: boolean
 *         expiresAt:
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
 *     summary: Get all coupons (admin only)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all coupons
 *       401:
 *         description: Unauthorized
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