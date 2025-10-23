import { Notification, UserNotification } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';
import mongoose from 'mongoose';
import cacheInvalidation from '../services/cacheInvalidation.js';
const ObjectId = mongoose.Types.ObjectId;


async function getNotifications(req, res, next) {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        const userNotifications = await UserNotification.find({ 
            userId: req.user._id 
        })
        .populate('notificationId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

        const total = await UserNotification.countDocuments({ userId: req.user._id });

        const transformedNotifications = userNotifications.map(un => ({
            id: un._id,
            isRead: un.isRead,
            readAt: un.readAt || null,
            createdAt: un.createdAt,
            notification: {
                id: un.notificationId._id,
                type: un.notificationId.type,
                title: un.notificationId.title,
                message: un.notificationId.message,
                priority: un.notificationId.priority,
                productId: un.notificationId.data?.productId,
                senderId: un.notificationId.senderId,
                createdAt: un.notificationId.createdAt
            }
        }));
        res.json({
            success: true,
            data: transformedNotifications,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        next(error);
    }
}


async function markAsRead(req, res, next) {
    try {
        const { id } = req.params;
        if(!ObjectId.isValid(id)) throw new AppError('Invalid notification ID', 400);
        
        const userNotification = await UserNotification.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!userNotification) {
            throw new AppError('Notification not found', 404);
        }

        // Invalidate user notifications cache
        await cacheInvalidation.invalidateNotifications(req.user._id);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        next(error);
    }
}

export { getNotifications, markAsRead };
