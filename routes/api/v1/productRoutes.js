import express from 'express';
import * as productController from '../../../controllers/productController.js';
import { validate } from '../../../middlewares/validation/validate.js';
import { createProductSchema, updateProductSchema } from '../../../middlewares/validation/schemas/productSchema.js';

const productRoutes = express.Router();


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
 *         imageUrl:
 *           type: string
 *           default: ''
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
 *     responses:
 *       200:
 *         description: List of products (filtered if parameters provided)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *             example:
 *               - _id: "507f1f77bcf86cd799439011"
 *                 title: "Laptop"
 *                 description: "High performance laptop"
 *                 price: 999.99
 *                 stock: 10
 *                 imageUrl: "https://example.com/laptop.jpg"
 *                 categories:
 *                   - _id: "507f1f77bcf86cd799439012"
 *                     name: "Electronics"
 */


productRoutes.get('/', productController.getAllProducts);

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
productRoutes.get('/:id', productController.getProductById);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Invalid input
 */
productRoutes.post('/', validate(createProductSchema), productController.createProduct);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
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
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Product not found
 */
productRoutes.put('/:id', validate(updateProductSchema), productController.updateProduct);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 *       404:
 *         description: Product not found
 */
productRoutes.delete('/:id', productController.deleteProduct);


export default productRoutes;