import express from "express";
import * as reviewController from '../../../controllers/reviewController.js';
import { authenticate } from '../../../middlewares/auth.js';
import { validate } from "../../../middlewares/validation/validate.js";
import { createReviewSchema, updateReviewSchema } from "../../../middlewares/validation/schemas/reviewSchemas.js";
import cache from "../../../middlewares/redisCache.js";

const reviewRoutes = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       required:
 *         - productId
 *         - rating
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         productId:
 *           type: string
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *         isApproved:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Add a product review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - rating
 *             properties:
 *               productId:
 *                 type: string
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review added
 *       401:
 *         description: Unauthorized
 */
reviewRoutes.post('/', validate(createReviewSchema), authenticate, reviewController.addReview);

/**
 * @swagger
 * /reviews/{productId}:
 *   get:
 *     summary: Get product reviews
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of product reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Review'
 */
reviewRoutes.get('/:productId', cache('productReviews', 600), reviewController.getProductReviews);

/**
 * @swagger
 * /reviews/{reviewId}:
 *   put:
 *     summary: Update review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated
 *       404:
 *         description: Review not found
 */
reviewRoutes.put('/:reviewId', validate(updateReviewSchema), authenticate, reviewController.updateReview);

/**
 * @swagger
 * /reviews/{reviewId}:
 *   delete:
 *     summary: Delete review
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted
 *       404:
 *         description: Review not found
 */
reviewRoutes.delete('/:reviewId', authenticate, reviewController.deleteReview);

export default reviewRoutes;