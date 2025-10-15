import express from "express";

const reviewRoutes = express.Router();

import * as reviewController from '../controllers/reviewController.js';
import { authenticate } from '../middlewares/auth.js';
import {validate} from "../middlewares/validation/validate.js";
import {createReviewSchema} from "../middlewares/validation/schemas/reviewSchemas.js";


reviewRoutes.post('/', validate(createReviewSchema), authenticate, reviewController.addReview);


export default reviewRoutes;