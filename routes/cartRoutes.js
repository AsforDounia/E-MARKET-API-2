import express from 'express';
import * as cartController from '../controllers/cartController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validation/validate.js';
import {addToCartSchema, updateCartItemSchema} from "../middlewares/validation/schemas/cartSchemas.js";

const cartRoutes = express.Router();

cartRoutes.post('/add', authenticate, validate(addToCartSchema), cartController.addToCart);
cartRoutes.get('/', authenticate, cartController.getCart);
cartRoutes.put('/item/:productId', authenticate, validate(updateCartItemSchema), cartController.updateCartItem);
cartRoutes.delete('/item/:productId', authenticate, cartController.removeFromCart);
cartRoutes.delete('/', authenticate, cartController.clearCart);

export default cartRoutes;