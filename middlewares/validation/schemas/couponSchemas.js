import { Yup } from "../yupExtensions.js";

// Schema de création de coupon
const createCouponSchema = Yup.object().shape({
  code: Yup.string().requiredField('Code').uppercase().trim(),
  type: Yup.string().requiredField('Type').oneOf(['percentage', 'fixed']),
  value: Yup.number().requiredField('Value').minValue(0),
  minAmount: Yup.number().optional().minValue(0),
  maxDiscount: Yup.number().optional().minValue(0),
  expiresAt: Yup.date().requiredField('Expiration date'),
  isActive: Yup.boolean().optional(),
  usageLimit: Yup.number().optional().minValue(1),
});

// Schema de modification de coupon
const updateCouponSchema = Yup.object().shape({
  code: Yup.string().optional().uppercase().trim(),
  type: Yup.string().optional().oneOf(['percentage', 'fixed']),
  value: Yup.number().optional().minValue(0),
  minAmount: Yup.number().optional().minValue(0),
  maxDiscount: Yup.number().optional().minValue(0),
  expiresAt: Yup.date().optional(),
  isActive: Yup.boolean().optional(),
  usageLimit: Yup.number().optional().minValue(1),
});

export {createCouponSchema, updateCouponSchema}