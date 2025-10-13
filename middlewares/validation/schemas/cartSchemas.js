import {Yup} from "../yupExtensions.js";

const addToCartSchema = Yup.object().shape({
    productId: Yup.string()
        .requiredField('Product ID'),
    quantity: Yup.number()
        .minValue(1, 'Quantity')
        .requiredField('Quantity')
});

const updateCartItemSchema = Yup.object().shape({
    quantity: Yup.number()
        .minValue(1, 'Quantity')
        .requiredField('Quantity')
});

export { addToCartSchema, updateCartItemSchema }