import mongoose from 'mongoose';
const { Schema } = mongoose;

const orderCouponSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique order-coupon pairs
orderCouponSchema.index({ orderId: 1, couponId: 1 }, { unique: true });

export default mongoose.model('OrderCoupon', orderCouponSchema);
