import express from "express";
import { authenticate, authorize } from "../middlewares/auth.js";
import * as couponController from "../controllers/couponController.js";


const couponRoutes = express.Router();

couponRoutes.post("/", authenticate, authorize(["admin", "seller"]), couponController.createCoupon);
couponRoutes.get("/seller", authenticate, couponController.getCouponsSeller);
couponRoutes.get("/", authenticate, authorize(["admin"]), couponController.getAllCoupons);
couponRoutes.get("/:id", authenticate, couponController.getCouponById);
couponRoutes.delete("/:id", authenticate, authorize(["admin", "seller"]), couponController.deleteCoupon);
couponRoutes.put("/:id", authenticate, authorize(["admin", "seller"]), couponController.updateCoupon);

export default couponRoutes;