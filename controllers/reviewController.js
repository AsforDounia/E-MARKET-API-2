import { Order, OrderItem, Product, Review } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';

const addReview = async (req, res, next) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user.id;

        const product = await Product.findById(productId);
        if (!product) throw new AppError('Product not found', 404);

        const validOrder = await Order.findOne({
            userId,
            status: { $in: ['paid', 'shipped', 'delivered'] },
            _id: {
                $in: (
                    await OrderItem.find({ productId }).distinct('orderId')
                )
            }
        });

        if (!validOrder) {
            throw new AppError('You can only review products you have purchased', 403);
        }

        const existingReview = await Review.findOne({ userId, productId, deletedAt: null });
        if (existingReview) throw new AppError('You have already reviewed this product', 400);

        const review = await Review.create({ userId, productId, rating, comment });

        res.status(201).json({
            message: 'Review added successfully',
            review
        });
    } catch (error) {
        next(error);
    }
};



export { addReview }