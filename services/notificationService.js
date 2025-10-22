import { EventEmitter } from 'events';
import { Notification, User, UserNotification } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';

class NotificationService extends EventEmitter {
    constructor() {
        super();
        this.setupListeners();
    }

    setupListeners() {
        this.on('PUBLISH_PRODUCT', this.handlePublishProduct);
    }

    emitPublishProduct(productData) {
        this.emit('PUBLISH_PRODUCT', productData);
    }

    async handlePublishProduct(data, next){
        try {

            if (!data.productId || !data.sellerId || !data.title) {
                throw new AppError('Missing required product data for notification (productId, sellerId, title)', 400);
            }
            const notification = await Notification.create({
                type: 'PUBLISH_PRODUCT',
                // title: 'Nouveau produit disponible',
                title: 'New Product Available',
                message: `The product "${data.title}" is now available in our marketplace.`,
                data: { productId: data.productId },
                senderId: data.sellerId,
                targetAudience: 'buyers'
            });
            
            const buyers = await User.find({ role: 'user', deletedAt: null });
            
            const userNotifications = buyers.map(buyer => ({
                userId: buyer._id,
                notificationId: notification._id
            }));
            
            await UserNotification.insertMany(userNotifications);

        console.log('The Product <', data.title, '> is published and the notification sent to all subscribers.');

        } catch (error) {
            next(error);
        }
    }
}

export default new NotificationService();
