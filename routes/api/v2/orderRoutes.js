import express from 'express';
import * as orderController from '../../../controllers/orderController.js';
import { authenticate } from '../../../middlewares/auth.js';
import {validate} from "../../../middlewares/validation/validate.js";
import {createOrderSchema, updateOrderStatusSchema} from "../../../middlewares/validation/schemas/orderSchemas.js";
import cache from '../../../middlewares/redisCache.js';
import {createLimiter} from "../../../middlewares/security.js";

const orderRoutes = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *         userId:
 *           type: string
 *           example: "507f1f77bcf86cd799439012"
 *         subtotal:
 *           type: number
 *           description: Total before discounts
 *           example: 1999.99
 *         discount:
 *           type: number
 *           description: Total discount applied
 *           example: 200.00
 *         total:
 *           type: number
 *           description: Final amount after discounts
 *           example: 1799.99
 *         status:
 *           type: string
 *           enum: [pending, paid, shipped, delivered, cancelled]
 *           default: pending
 *           example: "pending"
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               productTitle:
 *                 type: string
 *               quantity:
 *                 type: number
 *               priceAtOrder:
 *                 type: number
 *               sellerId:
 *                 type: string
 *         coupons:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               couponId:
 *                 type: string
 *               code:
 *                 type: string
 *               discountAmount:
 *                 type: number
 *           example:
 *             - couponId: "507f1f77bcf86cd799439013"
 *               code: "SAVE20"
 *               discountAmount: 200.00
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order from cart
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               couponCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of coupon codes to apply to the order
 *                 example: ["SAVE20", "WELCOME10"]
 *           example:
 *             couponCodes: ["SAVE20"]
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: object
 *                       properties:
 *                         orderId:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         userId:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439012"
 *                         subtotal:
 *                           type: number
 *                           example: 1999.99
 *                         discount:
 *                           type: number
 *                           example: 200.00
 *                         total:
 *                           type: number
 *                           example: 1799.99
 *       400:
 *         description: Invalid input or cart is empty
 *       401:
 *         description: Unauthorized
 */
orderRoutes.post('/', createLimiter(15, 100), validate(createOrderSchema), authenticate, orderController.createOrder);

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get user orders
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Orders retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized
 */
// orderRoutes.get('/', authenticate, cache('orders', 600), orderController.getOrders);

if (process.env.NODE_ENV !== "test") {
    orderRoutes.get('/', createLimiter(15, 100), authenticate, cache('orders', 600), orderController.getOrders);
} else {
    orderRoutes.get('/', createLimiter(15, 100), authenticate, orderController.getOrders);
}

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
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
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 */
// orderRoutes.get('/:id', authenticate ,cache('order', 600), orderController.getOrderById);
if (process.env.NODE_ENV !== "test") {
    orderRoutes.get('/:id', createLimiter(15, 100), authenticate, cache('orders', 600), orderController.getOrderById);
} else {
    orderRoutes.get('/:id', createLimiter(15, 100), authenticate, orderController.getOrderById);
}
/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Update order status
 *     tags: [Orders]
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
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, paid, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *       404:
 *         description: Order not found
 */
orderRoutes.put('/:id', createLimiter(15, 100), validate(updateOrderStatusSchema), authenticate, orderController.updateOrderStatus);

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Cancel order
 *     tags: [Orders]
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
 *         description: Order cancelled
 *       404:
 *         description: Order not found
 */
orderRoutes.delete('/:id', createLimiter(15, 100), authenticate, orderController.cancelOrder);

export default orderRoutes;