import { Order, OrderItem, Cart, CartItem, Product, Coupon } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';
import mongoose from 'mongoose';

const createOrder = async (req, res, next) => {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const { couponCode } = req.body;
            const userId = req.user.id;

            const cart = await Cart.findOne({ userId });
            if (!cart) throw new AppError('Cart not found', 404);

            const cartItems = await CartItem.find({ cartId: cart._id }).populate('productId');
            if (cartItems.length === 0) throw new AppError('Cart is empty', 400);

            let subtotal = 0;
            for (const item of cartItems) {
                const product = item.productId;
                if (!product || product.deletedAt) throw new AppError(`Product no longer available`, 400);
                if (product.stock < item.quantity) throw new AppError(`Insufficient stock for ${product.title}`, 400);

                subtotal += product.price * item.quantity;
            }

            let discount = 0;
            let couponId = null;
            if (couponCode) {
                const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
                if (!coupon) throw new AppError('Invalid coupon', 400);
                if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon expired', 400);
                if (subtotal < coupon.minAmount) throw new AppError(`Minimum amount ${coupon.minAmount} required`, 400);

                if (coupon.type === 'percentage') {
                    discount = (subtotal * coupon.value) / 100;
                    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
                } else {
                    discount = Math.min(coupon.value, subtotal);
                }
                couponId = coupon._id;
            }

            const total = subtotal - discount;

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

        res.status(201).json({
            message: 'Order created successfully'
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
        res.status(200).json({ orders });
    } catch (error) {
        next(error);
    }
};


export const getOrderById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) throw new AppError('Order not found', 404);

        const items = await OrderItem.find({ orderId: id }).populate('productId', 'title imageUrls');
        res.status(200).json({ order: { ...order.toObject(), items } });
    } catch (error) {
        next(error);
    }
};

export { createOrder, getOrders };