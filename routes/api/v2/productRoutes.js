import express from 'express';

const productRoutes = express.Router();
import * as productController from '../../../controllers/productController.js';
import { validate } from '../../../middlewares/validation/validate.js';
import { createProductSchema, updateProductSchema } from '../../../middlewares/validation/schemas/productSchema.js';
import { authenticate, authorize } from '../../../middlewares/auth.js';
import { upload } from "../../../middlewares/upload.js";
import { optimizeImages } from "../../../middlewares/optimizeImages.js";
import cache from '../../../middlewares/redisCache.js';
import {createLimiter} from "../../../middlewares/security.js";


/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *         - stock
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *           minimum: 0
 *         stock:
 *           type: number
 *           minimum: 0
 *         imageUrls:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of product image URLs
 *           example: ["/uploads/products/image1.jpg", "/uploads/products/image2.jpg"]
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         categories:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               _id:
 *                 type: string
 *               name:
 *                 type: string
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products with search and filters
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in product title and description
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category name or category ID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: inStock
 *         schema:
 *           type: boolean
 *         description: Filter products in stock (true/false)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price, date]
 *         description: Sort by price or date
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
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
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: seller
 *         schema:
 *           type: string
 *         description: Filter by seller ID
 *     responses:
 *       200:
 *         description: List of products with pagination
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
 *                   example: Products retrieved successfully
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 45
 *                     currentPage:
 *                       type: number
 *                       example: 1
 *                     totalPages:
 *                       type: number
 *                       example: 5
 *                     pageSize:
 *                       type: number
 *                       example: 10
 *                     hasNextPage:
 *                       type: boolean
 *                       example: true
 *                     hasPreviousPage:
 *                       type: boolean
 *                       example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 */


productRoutes.get('/', createLimiter(15, 100), cache('products',600), productController.getAllProducts);

/**
 * @swagger
 * /products/pending:
 *   get:
 *     summary: Get all pending products (admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 metadata:
 *                   type: object
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
productRoutes.get('/pending', createLimiter(15, 100), authenticate, cache('pendingProducts', 600), authorize("admin"), productController.getPendingProducts);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 */
productRoutes.get('/:id', createLimiter(15, 100), cache('product', 600), productController.getProductById);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Gaming Laptop"
 *               description:
 *                 type: string
 *                 example: "High performance gaming laptop with RTX 4080"
 *               price:
 *                 type: number
 *                 example: 1999.99
 *               stock:
 *                 type: number
 *                 example: 15
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 5
 *                 description: Product images (max 5)
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *                   example: "Product created successfully (awaiting admin validation)"
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Seller access required
 */
productRoutes.post('/', createLimiter(15, 100), authenticate, authorize("seller"), upload.array("images", 5), optimizeImages, productController.createProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: number
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *               categoryIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this product
 *       404:
 *         description: Product not found
 */
productRoutes.put('/:id', createLimiter(15, 100), authenticate, validate( updateProductSchema ),authorize("seller"), productController.updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product (soft delete)
 *     tags: [Products]
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
 *         description: Product soft-deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Product not found
 */
productRoutes.delete('/:id', createLimiter(15, 100), authenticate ,authorize(["seller", "admin"]), productController.deleteProduct);

/**
 * @swagger
 * /products/{id}/visibility:
 *   patch:
 *     summary: Toggle product visibility
 *     tags: [Products]
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
 *               - isVisible
 *             properties:
 *               isVisible:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Product visibility updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this product
 *       404:
 *         description: Product not found
 */
productRoutes.patch('/:id/visibility', createLimiter(15, 100), authenticate, authorize("seller"), productController.updateProductVisibility);

/**
 * @swagger
 * /products/{id}/validate:
 *   patch:
 *     summary: Approve product (admin only)
 *     tags: [Products]
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
 *         description: Product validated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Product not found
 */
productRoutes.patch('/:id/validate', createLimiter(15, 100), authenticate, authorize("admin"), productController.validateProduct);

/**
 * @swagger
 * /products/{id}/reject:
 *   patch:
 *     summary: Reject product (admin only)
 *     tags: [Products]
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
 *         description: Product rejected successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Product not found
 */
productRoutes.patch('/:id/reject', createLimiter(15, 100), authenticate, authorize("admin"), productController.rejectProduct);

export default productRoutes;