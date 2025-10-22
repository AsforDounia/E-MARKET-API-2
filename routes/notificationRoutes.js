import express from "express";
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/auth.js';

const notificationRoutes = express.Router();

notificationRoutes.get('/', authenticate, notificationController.getNotifications);

export default notificationRoutes;