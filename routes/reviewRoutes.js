import express from "express";

const reviewRoutes = express.Router();

import * as reviewController from '../controllers/reviewController.js';
import { authenticate } from '../middlewares/auth.js';
import {validate} from "../middlewares/validation/validate.js";
import {createReviewSchema, updateReviewSchema} from "../middlewares/validation/schemas/reviewSchemas.js";
import cache from "../middlewares/redisCache.js";


reviewRoutes.post('/', validate(createReviewSchema), authenticate, reviewController.addReview);
reviewRoutes.get('/:productId', cache('productReviews', 600), reviewController.getProductReviews);
reviewRoutes.put('/:reviewId', validate(updateReviewSchema), authenticate, reviewController.updateReview);
reviewRoutes.delete('/:reviewId', authenticate, reviewController.deleteReview);

export default reviewRoutes;