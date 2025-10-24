import express from 'express';
import productRoutes from './productRoutes.js';
import userRoutes from './userRoutes.js';
import categoryRoutes from './categoryRoutes.js';

const router = express.Router();

router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);

export default router;