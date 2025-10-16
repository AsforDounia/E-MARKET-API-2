import { Yup } from "../yupExtensions.js";

const createOrderSchema = Yup.object().shape({
    couponCode: Yup.string().optional()
});

const updateOrderStatusSchema = Yup.object().shape({
    status: Yup.string()
        .requiredField('Status')
        .enumField(['pending', 'paid', 'shipped', 'delivered'], 'Status')
});

export { createOrderSchema, updateOrderStatusSchema };
