import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate } from '../middlewares/auth.js';

const orderRoutes = express.Router();

orderRoutes.post('/', authenticate, orderController.createOrder);
orderRoutes.get('/', authenticate, orderController.getOrders);
orderRoutes.get('/:id', authenticate, orderController.getOrderById);
orderRoutes.put('/:id', authenticate, orderController.updateOrderStatus);
orderRoutes.delete('/:id', authenticate, orderController.cancelOrder);

export default orderRoutes;