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
 *         userId:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             type: object
 *         totalAmount:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, paid, shipped, delivered, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
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
 *               shippingAddress:
 *                 type: object
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
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
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
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