import { Order, OrderItem, Cart, CartItem, Product, Coupon, UserCoupon } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';
import mongoose from 'mongoose';
import notificationService from '../services/notificationService.js';
import cacheInvalidation from '../services/cacheInvalidation.js';
const ObjectId = mongoose.Types.ObjectId;

const createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    let userId, subtotal, discount, total, orderId;
    try {
        await session.withTransaction(async () => {
            const { couponCode } = req.body;
            userId = req.user.id;

            const cart = await Cart.findOne({ userId });
            if (!cart) throw new AppError('Cart not found', 404);

            const cartItems = await CartItem.find({ cartId: cart._id }).populate('productId');
            if (cartItems.length === 0) throw new AppError('Cart is empty', 400);

            subtotal = 0;
            for (const item of cartItems) {
                const product = item.productId;
                if (!product || product.deletedAt) throw new AppError(`Product no longer available`, 400);
                if (product.stock < item.quantity) throw new AppError(`Insufficient stock for ${product.title}`, 400);

                subtotal += product.price * item.quantity;
            }

            discount = 0;
            let couponId = null;
            if (couponCode) {
                const coupon = await Coupon.findOne({ code: couponCode, isActive: true }).session(session);
                if (!coupon) throw new AppError('Invalid coupon', 400);
                if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon expired', 400);
                
                // Check if user has already used this coupon
                const existingUsage = await UserCoupon.findOne({ user: userId, coupon: coupon._id }).session(session);
                if (existingUsage) throw new AppError('Coupon already used', 400);
                
                // Check usage limit
                if (coupon.usageLimit) {
                    const usageCount = await UserCoupon.countDocuments({ coupon: coupon._id }).session(session);
                    if (usageCount >= coupon.usageLimit) throw new AppError('Coupon usage limit reached', 400);
                }
                
                if (subtotal < coupon.minAmount) throw new AppError(`Minimum amount ${coupon.minAmount} required`, 400);

                if (coupon.type === 'percentage') {
                    discount = (subtotal * coupon.value) / 100;
                    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
                } else {
                    discount = Math.min(coupon.value, subtotal);
                }
                couponId = coupon._id;
                
                // Record coupon usage
                await UserCoupon.create([{
                    user: userId,
                    coupon: coupon._id
                }], { session });
            }

            total = subtotal - discount;

            const order = await Order.create([{
                userId,
                couponId,
                subtotal,
                discount,
                total
            }], { session });

            orderId = order[0]._id;

            for (const item of cartItems) {
                await OrderItem.create([{
                    orderId: order[0]._id,
                    productId: item.productId._id,
                    sellerId: item.productId.sellerId,
                    productTitle: item.productId.title,
                    quantity: item.quantity,
                    priceAtOrder: item.productId.price
                }], { session });

                await Product.updateOne(
                    { _id: item.productId._id },
                    { $inc: { stock: -item.quantity } },
                    { session }
                );
            }

            await CartItem.deleteMany({ cartId: cart._id }, { session });
        });

        notificationService.emitOrderCreated({ orderId, total, userId });
        
        // Invalidate orders cache
        await cacheInvalidation.invalidateUserOrders(userId);
        
        res.status(201).json({
            status: "success",
            message: 'Order created successfully',
            data: {
                order: {
                    orderId,
                    userId,
                    subtotal,
                    discount,
                    total
                }
            }
        });
    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
};


const getOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json({
            status: "success",
            message: 'Orders retrieved successfully',
            data:{
                orders: orders
            }
        });
    } catch (error) {
        next(error);
    }
};


const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if(!ObjectId.isValid(id)) throw new AppError('Invalid order ID', 400);
        
        const order = await Order.findById(id);
        if (!order) throw new AppError('Order not found', 404);

        // Authorization check: only order owner or admin can view
        const userId = req.user.id;
        const isOwner = order.userId.toString() === userId.toString();
        const isAdmin = req.user.role === 'admin';
        
        if (!isOwner && !isAdmin) {
            throw new AppError('You are not authorized to view this order', 403);
        }

        const items = await OrderItem.find({ orderId: id }).populate('productId', 'title imageUrls');
        res.status(200).json({
            status: "success",
            message: 'Order retrieved successfully',
            data:{
                order: { ...order.toObject(), items }
            }
        });
    } catch (error) {
        next(error);
    }
};

const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        if(!ObjectId.isValid(id)) throw new AppError('Invalid order ID', 400);
        const { status } = req.body;

        const validStatuses = ['pending', 'paid', 'shipped', 'delivered'];
        if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

        const order = await Order.findById(id);
        if (!order) throw new AppError('Order not found', 404);

        // Authorization check: only admin can update order status
        if (req.user.role !== 'admin') {
            throw new AppError('Only admins can update order status', 403);
        }

        if (order.status === 'cancelled' || order.status === 'delivered') {
            throw new AppError(`Cannot update ${order.status} order`, 400);
        }

        order.status = status;
        await order.save();

        const notData = { orderId: id, status, orderUserId: order.userId };
        notificationService.emitOrderUpdated(notData, 'ORDER_UPDATED');
        
        // Invalidate orders cache
        await cacheInvalidation.invalidateUserOrders(order.userId);
        
        res.status(200).json({
            status: "success",
            message: 'Order status updated',
            data: {
                order: order
            }
        });
    } catch (error) {
        next(error);
    }
};

const cancelOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { id } = req.params;
            if(!ObjectId.isValid(id)) throw new AppError('Invalid order ID', 400);
            const userId = req.user.id;

            const order = await Order.findOne({ _id: id }).session(session);
            if (!order) throw new AppError('Order not found', 404);

            const isOwner = order.userId.toString() === userId.toString();
            const isAdmin = req.user.role === 'admin';

            if (!isOwner && !isAdmin) {
                throw new AppError('You are not allowed to cancel this order', 403);
            }

            if (order.status === 'cancelled') {
                throw new AppError('Order already cancelled', 400);
            }

            if (order.status !== 'pending') {
                throw new AppError('Only pending orders can be cancelled', 400);
            }

            const orderItems = await OrderItem.find({ orderId: id }).session(session);
            for (const item of orderItems) {
                await Product.updateOne(
                    { _id: item.productId },
                    { $inc: { stock: item.quantity } },
                    { session }
                );
            }

            // If coupon was used, remove the usage record
            if (order.couponId) {
                await UserCoupon.deleteOne(
                    { user: order.userId, coupon: order.couponId },
                    { session }
                );
            }

            order.status = 'cancelled';
            await order.save({ session });
        });

        const order = await Order.findById(req.params.id);
        const notData = { orderId: req.params.id, orderUserId: order.userId };
        notificationService.emitOrderUpdated(notData, 'ORDER_CANCELLED');
        
        // Invalidate orders cache
        await cacheInvalidation.invalidateUserOrders(order.userId);
        
        res.status(200).json({
            status: "success",
            message: 'Order cancelled successfully',
            data: {
                order: order
            }
        });
    } catch (error) {
        next(error);
    } finally {
        await session.endSession();
    }
};


export { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder };