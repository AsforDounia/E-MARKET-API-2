import express from "express";
import * as couponController from "../controllers/couponController.js";

import { authenticate, authorize } from "../middlewares/auth.js";

const couponRoutes = express.Router();

couponRoutes.post("/seller", authenticate, couponController.createCoupon);
couponRoutes.get("/seller", authenticate, couponController.getCouponsSeller);
couponRoutes.get("/", authorize(["admin"]), couponController.getAllCoupons);
couponRoutes.get("/seller/:id", couponController.getCouponById);
// couponRoutes.post("/", couponController.createCoupon);

export default couponRoutes;