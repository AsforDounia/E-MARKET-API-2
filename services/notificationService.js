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
        this.on('ORDER_CREATED', this.handleOrderCreated);
        this.on('ORDER_UPDATED', this.handleOrderUpdated);
    }

    emitPublishProduct(productData) {
        this.emit('PUBLISH_PRODUCT', productData);
    }

    emitOrderCreated(orderData) {
        this.emit('ORDER_CREATED', orderData);
    }

    emitOrderUpdated(orderData) {
        this.emit('ORDER_UPDATED', orderData);
    }

    async handlePublishProduct(data, next){
        try {

            if (!data.productId || !data.sellerId || !data.title) {
                throw new AppError('Missing required product data for notification (productId, sellerId, title)', 400);
            }
            const notification = await Notification.create({
                type: 'PUBLISH_PRODUCT',
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

    async handleOrderCreated(data) {
    try {
        const notification = await Notification.create({
            type: 'ORDER_CREATED',
            title: 'New Order Created',
            message: `Order #${data.orderId} created for a total of ${data.total}€`,
            data: { orderId: data.orderId },
            senderId: data.userId,
            targetAudience: 'sellers'
        });


        const sellers = await User.find({ role: 'seller', deletedAt: null });
        const userNotifications = sellers.map(seller => ({
            userId: seller._id,
            notificationId: notification._id
        }));

        await UserNotification.insertMany(userNotifications);
            console.log(`Order created notification sent to ${sellers.length} sellers`);
        } catch (error) {
            console.error('Error creating order notification:', error);
        }
    }

    async handleOrderUpdated(data , type) {
        try {
            const notification = await Notification.create({
                type: type === 'ORDER_UPDATED' ? 'ORDER_UPDATED' : 'ORDER_CANCELLED',
                title: type === 'ORDER_UPDATED' ? 'Order Updated' : 'Order Cancelled',
                message: `Order #${data.orderId} has been ${type === 'ORDER_UPDATED' ? 'updated' : 'cancelled'}.`,
                data: { orderId: data.orderId },
                senderId: data.orderUserId,
                targetAudience: 'sellers'
            });

            const sellers = await User.find({ role: 'seller', deletedAt: null });
            const userNotifications = sellers.map(seller => ({
                userId: seller._id,
                notificationId: notification._id
            }));

            await UserNotification.insertMany(userNotifications);
            console.log(`Order ${type === 'ORDER_UPDATED' ? 'updated' : 'cancelled'} notification sent to ${sellers.length} sellers`);
            
        } catch (error) {
            console.error('Error creating order updated notification:', error);
        }
    }
}
export default new NotificationService();
