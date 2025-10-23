import express from 'express';
import * as orderController from '../controllers/orderController.js';
import { authenticate } from '../middlewares/auth.js';
import {validate} from "../middlewares/validation/validate.js";
import {createOrderSchema, updateOrderStatusSchema} from "../middlewares/validation/schemas/orderSchemas.js";
import cache from '../middlewares/redisCache.js';

const orderRoutes = express.Router();

orderRoutes.post('/', validate(createOrderSchema), authenticate, orderController.createOrder);
orderRoutes.get('/', cache('orders', 600), authenticate, orderController.getOrders);
orderRoutes.get('/:id', cache('order', 600), authenticate, orderController.getOrderById);
orderRoutes.put('/:id', validate(updateOrderStatusSchema), authenticate, orderController.updateOrderStatus);
orderRoutes.delete('/:id', authenticate, orderController.cancelOrder);

export default orderRoutes;