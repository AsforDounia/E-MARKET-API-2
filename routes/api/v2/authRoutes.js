import express from 'express';
import * as authController  from '../../../controllers/authController.js';
import { validate } from '../../../middlewares/validation/validate.js';
import { registerSchema, loginSchema } from '../../../middlewares/validation/schemas/authSchemas.js';
import { createLimiter } from "../../../middlewares/security.js";

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *               - email
 *               - password
 *             properties:
 *               fullname:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 */
router.post('/register', createLimiter(1, 5), validate(registerSchema), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', createLimiter(1, 10), validate(loginSchema), authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

export default router;