import { Order, OrderItem, Product, Review } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';
import mongoose from "mongoose";
import cacheInvalidation from '../services/cacheInvalidation.js';
const ObjectId = mongoose.Types.ObjectId;

const addReview = async (req, res, next) => {
    try {
        const { productId, rating, comment } = req.body;
        if(!ObjectId.isValid(productId)) throw new AppError('Invalid product ID', 400)
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

        // Invalidate product reviews cache
        await cacheInvalidation.invalidateProductReviews(productId);

        res.status(201).json({
            status: "success",
            message: 'Review added successfully',
            data:{
                review: review
            }
        });
    } catch (error) {
        next(error);
    }
};


const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;
        if(!ObjectId.isValid(productId)) throw new AppError('Invalid product ID', 400)

        const product = await Product.findById(productId);
        if (!product) throw new AppError('Product not found', 404);

        const reviews = await Review.find({ productId, deletedAt: null }).sort({ createdAt: -1 });

        const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
        const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

        res.status(200).json({
            status: "success",
            message: 'Reviews retrieved successfully',
            data: {
                reviews: reviews,
                averageRating: averageRating
            }
        });
    } catch (error) {
        next(error);
    }
};

const updateReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        if(!ObjectId.isValid(reviewId)) throw new AppError('Invalid review ID', 400)
        const { rating, comment } = req.body;

        const review = await Review.findOneAndUpdate(
            { _id: reviewId, userId: req.user.id, deletedAt: null },
            { rating, comment },
            { new: true }
        );

        if (!review) throw new AppError('Review not found', 404);

        // Invalidate product reviews cache
        await cacheInvalidation.invalidateProductReviews(review.productId);

        res.status(200).json({
            status: "success",
            message: 'Review updated successfully',
            data: {
                review: review
            }
        });
    } catch (error) {
        next(error);
    }
};


const deleteReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        if(!ObjectId.isValid(reviewId)) throw new AppError('Invalid review ID', 400)

        const review = await Review.findOne({ _id: reviewId, deletedAt: null });

        if (!review) throw new AppError('Review not found', 404);

        if (review.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            throw new AppError('You are not authorized to delete this review', 403);
        }

        review.deletedAt = new Date();
        await review.save();

        // Invalidate product reviews cache
        await cacheInvalidation.invalidateProductReviews(review.productId);

        res.status(200).json({
            status: "success",
            message: 'Review soft-deleted successfully',
            data: {
                review: review
            }
        });
    } catch (error) {
        next(error);
    }
};
export { addReview, getProductReviews, updateReview, deleteReview }