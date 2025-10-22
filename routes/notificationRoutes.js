import express from "express";
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/auth.js';

const notificationRoutes = express.Router();

notificationRoutes.get('/', authenticate, notificationController.getNotifications);
notificationRoutes.patch('/:id/read', authenticate, notificationController.markAsRead);

export default notificationRoutes;