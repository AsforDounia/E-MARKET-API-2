import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate } from '../middlewares/auth.js';

const orderRoutes = express.Router();

orderRoutes.post('/', authenticate, orderController.createOrder);

export default orderRoutes;