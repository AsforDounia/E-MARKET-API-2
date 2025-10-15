import express from "express";

const reviewRoutes = express.Router();

import * as reviewController from '../controllers/reviewController.js';
import { authenticate } from '../middlewares/auth.js';
import {validate} from "../middlewares/validation/validate.js";
import {createReviewSchema, updateReviewSchema} from "../middlewares/validation/schemas/reviewSchemas.js";


reviewRoutes.post('/', validate(createReviewSchema), authenticate, reviewController.addReview);
reviewRoutes.get('/:productId', reviewController.getProductReviews);
reviewRoutes.put('/:reviewId', validate(updateReviewSchema), authenticate, reviewController.updateReview);

export default reviewRoutes;