import express from 'express';
import * as usertController from '../../../controllers/userController.js';
import { validate } from '../../../middlewares/validation/validate.js';
import { createUserSchema } from '../../../middlewares/validation/schemas/userSchema.js';
import { authenticate, authorize } from "../../../middlewares/auth.js";
import cache from '../../../middlewares/redisCache.js';
import {createLimiter} from "../../../middlewares/security.js";


const userRoutes = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - fullname
 *         - email
 *         - password
 *       properties:
 *         _id:
 *           type: string
 *         fullname:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 6
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           default: user
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
 */


/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
userRoutes.get('/', createLimiter(15, 100), cache('users', 600), authenticate, authorize(["admin"]), usertController.getAllUsers);

userRoutes.get("/profile", createLimiter(15, 100), cache('userProfile', 600), authenticate, usertController.getUserProfile);
/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
userRoutes.get('/:id', createLimiter(15, 100), cache('user', 600), authenticate, authorize(["admin"]),usertController.getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Invalid input
 */

userRoutes.post('/', createLimiter(15, 100),validate(createUserSchema), authenticate, authorize("admin"), usertController.createUser);


/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (soft delete)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
userRoutes.delete('/:id', createLimiter(15, 100), authenticate, authorize(["admin"]), usertController.deleteUser);

userRoutes.put("/profile", createLimiter(15, 100), authenticate, usertController.updateProfile);


userRoutes.patch('/:id/role', createLimiter(15, 100),authenticate, authorize("admin"), usertController.updateUserRole);

export default userRoutes;