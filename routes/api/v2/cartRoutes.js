import express from 'express';
import * as cartController from '../../../controllers/cartController.js';
import { authenticate } from '../../../middlewares/auth.js';
import { validate } from '../../../middlewares/validation/validate.js';
import {addToCartSchema, updateCartItemSchema} from "../../../middlewares/validation/schemas/cartSchemas.js";
import cache from '../../../middlewares/redisCache.js';
import {createLimiter} from "../../../middlewares/security.js";

const cartRoutes = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *         quantity:
 *           type: number
 *           minimum: 1
 *         price:
 *           type: number
 */

/**
 * @swagger
 * /cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Cart]
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
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 example: "507f1f77bcf86cd799439011"
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 example: 2
 *     responses:
 *       200:
 *         description: Item added to cart successfully
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
 *                   example: "Product added to cart successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cart:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         userId:
 *                           type: string
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               productId:
 *                                 type: object
 *                                 properties:
 *                                   _id:
 *                                     type: string
 *                                   title:
 *                                     type: string
 *                                   price:
 *                                     type: number
 *                                   stock:
 *                                     type: number
 *                                   imageUrls:
 *                                     type: array
 *                                     items:
 *                                       type: string
 *                               quantity:
 *                                 type: number
 *                         totalAmount:
 *                           type: number
 *                           description: Sum of all items (price × quantity)
 *                           example: 2999.98
 *       400:
 *         description: Invalid input or insufficient stock
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
cartRoutes.post('/add', createLimiter(15, 100), authenticate, validate(addToCartSchema), cartController.addToCart);

/**
 * @swagger
 * /cart:
 *   get:
 *     summary: Get user cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
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
 *                   example: "Cart retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cart:
 *                       type: object
 *                       properties:
 *                         items:
 *                           type: array
 *                           items:
 *                             type: object
 *                         totalAmount:
 *                           type: number
 *                           example: 2999.98
 *       401:
 *         description: Unauthorized
 */
cartRoutes.get('/', createLimiter(15, 100), authenticate ,cache('cart', 600), cartController.getCart);

/**
 * @swagger
 * /cart/item/{productId}:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Cart item updated
 *       401:
 *         description: Unauthorized
 */
cartRoutes.put('/item/:productId', createLimiter(15, 100), authenticate, validate(updateCartItemSchema), cartController.updateCartItem);

/**
 * @swagger
 * /cart/item/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from cart
 *       401:
 *         description: Unauthorized
 */
cartRoutes.delete('/item/:productId', createLimiter(15, 100), authenticate, cartController.removeFromCart);

/**
 * @swagger
 * /cart:
 *   delete:
 *     summary: Clear entire cart
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
 *       401:
 *         description: Unauthorized
 */
cartRoutes.delete('/', createLimiter(15, 100), authenticate, cartController.clearCart);

export default cartRoutes;