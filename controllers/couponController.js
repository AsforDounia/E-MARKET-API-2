import { AppError } from "../middlewares/errorHandler.js";
import Coupon from "../models/Coupon.js";


//creer un coupon
async function createCoupon(req, res, next){
    try {
        if (!req.user || req.user.role !== "seller") {
            throw new AppError("Only sellers can create coupons", 403);
        }

        const {code, type, value, minAmount, maxDiscount, expiresAt, isActive} = req.body;

        if(!code || !type || !value || !minAmount || !maxDiscount|| !expiresAt){
            throw new AppError("code, type, value, minAmount, maxDiscount, and expiresAt are reequired", 400);
        }

        // Vérifie que le type est valide
        if (!["percentage", "fixed"].includes(type)) {
            throw new AppError("Invalid coupon type. Must be 'percentage' or 'fixed'", 400);
        }
        
        //vérifier si le code déja exist
        const existing = await Coupon.findOne({ code, sellerId: req.user._id });
        if (existing) {
            throw new AppError("A coupon with this code already exists", 400);
        }
        
        const coupon = await Coupon.create({
            code: code.trim().toUpperCase(),
            type,
            value,
            minAmount,
            maxDiscount,
            expiresAt: new Date(expiresAt),
            isActive: isActive ?? true,
            sellerId: req.user._id
        });

        res.status(201).json({message: "Coupon created succesfuly", data : coupon});
    } catch (error) {
        next(error);
    }
}

// recuperer les coupons d'un seller
async function getCouponsSeller(req, res, next){
    try {
        if(!req.user || req.user.role != "seller"){
            throw new AppError("Only sellers can access their coupons", 403);
        }

        const coupons = await Coupon.find({ sellerId: req.user._id });

        if(coupons.length === 0 ){
            res.status(200).json({
                success: true,
                message: "No coupons found for this seller",
                data: [],
            });
        }

        res.status(200).json({
            success: true,
            message: "Coupons retrieved successfully",
            data: coupons,
        });
    } catch (error) {
        next(error);
    }
}

// recuperer tout les coupons
async function getAllCoupons(req, res, next){
    try {
        const coupons = await Coupon.find();

        res.status(200).json({
            success: true,
            message: "Coupons retrieved successfully",
            data: coupons,
        });
    } catch (error) {
        next(error);
    }
}

// récupérer un coupon du seller connecté par son id
async function getCouponById(req, res, next){
    try {
        if(!req.user || req.user._id != "seller"){
            throw new AppError("Only sellers can access their coupons", 403);
        }
        
        const coupon = await Coupon.findOne({
            _id: req.params.id,
            sellerId: req.user._id
        })
        
        if(!coupon){
            throw new AppError("Coupon not found", 404);
        }
        
        res.status(200).json({
            success: true,
            message: "Coupon retrieved successfully",
            data: coupon,
        });
        
    } catch (error) {
        next(error);
    }
}

export { createCoupon, getCouponsSeller, getAllCoupons, getCouponById };