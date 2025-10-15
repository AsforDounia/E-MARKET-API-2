import { Yup } from "../yupExtensions.js";

const createReviewSchema = Yup.object().shape({
    rating: Yup.number()
        .requiredField('Rating')
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating must be at most 5'),
    comment: Yup.string().optional()
});



export { createReviewSchema };
