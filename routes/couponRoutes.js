import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import * as couponController from "../controllers/couponController.js";
import cache from "../middlewares/redisCache.js";


const couponRoutes = express.Router();

couponRoutes.post("/", authenticate, authorize(["admin", "seller"]), couponController.createCoupon);
couponRoutes.get("/seller", cache('couponsSeller', 600), authenticate, couponController.getCouponsSeller);
couponRoutes.get("/", cache('coupons', 600), authenticate, authorize(["admin"]), couponController.getAllCoupons);
couponRoutes.get("/:id", cache('coupon', 600), authenticate, couponController.getCouponById);
couponRoutes.delete("/:id", authenticate, authorize(["admin", "seller"]), couponController.deleteCoupon);
couponRoutes.put("/:id", authenticate, authorize(["admin", "seller"]), couponController.updateCoupon);

export default couponRoutes;