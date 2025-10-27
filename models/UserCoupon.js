import mongoose from "mongoose";

const userCouponSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "user_coupons",
    timestamps: true,
  }
);

// Index unique pour éviter qu'un utilisateur utilise le même coupon plusieurs fois
userCouponSchema.index({ user: 1, coupon: 1 });

export default mongoose.model("UserCoupon", userCouponSchema);
