import express from "express";
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/auth.js';
import cache from "../middlewares/redisCache.js";

const notificationRoutes = express.Router();

notificationRoutes.get('/', cache('notifications', 60), authenticate, notificationController.getNotifications);
notificationRoutes.patch('/:id/read', authenticate, notificationController.markAsRead);

export default notificationRoutes;