import { Notification, UserNotification } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';


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

        res.json({
            success: true,
            data: {
                notifications: userNotifications.map(notification => notification.notificationId)
            },
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

export { getNotifications };
