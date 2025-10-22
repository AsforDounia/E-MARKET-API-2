import { Order, OrderItem, Cart, CartItem, Product, Coupon } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';
import mongoose from 'mongoose';
import notificationService from '../services/notificationService.js';
const ObjectId = mongoose.Types.ObjectId;

const createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    let userId, subtotal, discount, total;
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
                const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
                if (!coupon) throw new AppError('Invalid coupon', 400);
                if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon expired', 400);
                if (coupon.usedBy.includes(userId)) throw new AppError('Coupon already used', 400);
                if (coupon.usageLimit && coupon.usedBy.length >= coupon.usageLimit) throw new AppError('Coupon usage limit reached', 400);
                if (subtotal < coupon.minAmount) throw new AppError(`Minimum amount ${coupon.minAmount} required`, 400);

                if (coupon.type === 'percentage') {
                    discount = (subtotal * coupon.value) / 100;
                    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
                } else {
                    discount = Math.min(coupon.value, subtotal);
                }
                couponId = coupon._id;
                
                await Coupon.updateOne(
                    { _id: coupon._id },
                    { $addToSet: { usedBy: userId } },
                    { session }
                );
            }

            total = subtotal - discount;

            const order = await Order.create([{
                userId,
                couponId,
                subtotal,
                discount,
                total
            }], { session });

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

        notificationService.emitOrderCreated({ orderId: userId, total, userId });
        res.status(201).json({
            status: "success",
            message: 'Order created successfully',
            data: {
                order: {
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
        if(!ObjectId.isValid(id)) throw new AppError('Invalid order ID', 400)
        const order = await Order.findById(id);
        if (!order) throw new AppError('Order not found', 404);

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
        if(!ObjectId.isValid(id)) throw new AppError('Invalid order ID', 400)
        const { status } = req.body;

        const validStatuses = ['pending', 'paid', 'shipped', 'delivered'];
        if (!validStatuses.includes(status)) throw new AppError('Invalid status', 400);

        const order = await Order.findById(id);
        if (!order) throw new AppError('Order not found', 404);

        if (order.status === 'cancelled' || order.status === 'delivered') throw new AppError(`Cannot update ${order.status} order`, 400);

        order.status = status;
        await order.save();

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
        session.startTransaction();

        const { id } = req.params;
        if(!ObjectId.isValid(id)) throw new AppError('Invalid order ID', 400)
        const userId = req.user.id;

        const order = await Order.findOne({ _id: id, userId }).session(session);
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

        order.status = 'cancelled';
        await order.save({ session });

        await session.commitTransaction();
        res.status(200).json({
            status: "success",
            message: 'Order cancelled successfully',
            data: {
                order: order
            }
        });
    } catch (error) {
        await session.abortTransaction();
        next(error);
    } finally {
        session.endSession();
    }
};


export { createOrder, getOrders, getOrderById, updateOrderStatus, cancelOrder };