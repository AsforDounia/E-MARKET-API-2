import { Yup } from "../yupExtensions.js";

const createReviewSchema = Yup.object().shape({
    rating: Yup.number()
        .requiredField('Rating')
        .minValue(1, 'Rating')
        .maxValue(5, 'Rating must be at most 5'),
    comment: Yup.string().optional()
});

const updateReviewSchema = Yup.object().shape({
    rating: Yup.number()
        .optional()
        .minValue(1, 'Rating')
        .maxValue(5, 'Rating must be at most 5'),
    comment: Yup.string().optional()
});


export { createReviewSchema, updateReviewSchema };
