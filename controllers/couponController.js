import { AppError } from "../middlewares/errorHandler.js";
import Coupon from "../models/Coupon.js";
import cacheInvalidation from "../services/cacheInvalidation.js";

//creer un coupon
async function createCoupon(req, res, next) {
  try {
    if (
      !req.user ||
      (req.user.role !== "seller" && req.user.role !== "admin")
    ) {
      throw new AppError("Only sellers or admins can create coupons", 403);
    }

    const {
      code,
      type,
      value,
      minAmount,
      maxDiscount,
      expiresAt,
      isActive,
      usageLimit,
    } = req.body;

    if (!code || !type || !value || !minAmount || !maxDiscount || !expiresAt) {
      throw new AppError(
        "code, type, value, minAmount, maxDiscount, and expiresAt are required",
        400
      );
    }

    // Vérifie que le type est valide
    if (!["percentage", "fixed"].includes(type)) {
      throw new AppError(
        "Invalid coupon type. Must be 'percentage' or 'fixed'",
        400
      );
    }

    //vérifier si le code déja exist
    const existing = await Coupon.findOne({ code, createdBy: req.user._id });
    if (existing) {
      throw new AppError("A coupon with this code already exists", 400);
    }

    if (type === "percentage" && (value < 1 || value > 99))
      throw new AppError(
        "For percentage type, the value must be between 1 and 99.",
        400
      );

    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      type,
      value,
      minAmount,
      maxDiscount,
      usageLimit,
      expiresAt: new Date(expiresAt),
      isActive: isActive ?? true,
      createdBy: req.user._id,
    });

    // Invalidate coupons cache
    await cacheInvalidation.invalidateCoupons();

    res
      .status(201)
      .json({ message: "Coupon created succesfuly", data: coupon });
  } catch (error) {
    next(error);
  }
}

// recuperer les coupons d'un seller
async function getCouponsSeller(req, res, next) {
  try {
    if (!req.user || !["admin", "seller"].includes(req.user.role)) {
      throw new AppError("Only sellers or admins can get coupons", 403);
    }

    let userId;
    if (req.user.role === "admin") {
      userId = req.query.userId;
    } else {
      userId = req.user._id;
    }
    const coupons = await Coupon.find({ createdBy: userId });

    if (coupons.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No coupons found for this seller",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Coupons retrieved successfully",
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
}

// recuperer tout les coupons
async function getAllCoupons(req, res, next) {
  try {
    const { type, isActive, page = 1, limit = 15 } = req.query;

    const filter = {};

    if (type) filter.type = type;
    if (isActive) filter.isActive = isActive;

    const skip = (Number(page) - 1) * Number(limit);

    const coupons = await Coupon.find(filter).skip(skip).limit(Number(limit));

    const totalCoupon = await Coupon.countDocuments();

    res.status(200).json({
      success: true,
      message: "Coupons retrieved successfully",
      currentPage: Number(page),
      totalPages: Math.ceil(totalCoupon / limit),
      totalCoupon,
      coupons,
    });
  } catch (error) {
    next(error);
  }
}

// récupérer un coupon du seller connecté par son id
async function getCouponById(req, res, next) {
  try {
    if (!req.user || !["seller", "admin"].includes(req.user.role)) {
      throw new AppError("Only sellers or admins can access coupons", 403);
    }

    let filter = {};
    if (req.user.role === "admin") filter = { _id: req.params.id };
    else filter = { _id: req.params.id, createdBy: req.user._id };
    const coupon = await Coupon.findOne(filter);

    if (!coupon) {
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

//modifier un coupon
async function updateCoupon(req, res, next) {
  try {
    if (!req.user || !["admin", "seller"].includes(req.user.role)) {
      throw new AppError("Only sellers or admins can update coupons", 403);
    }

    const filter =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, createdBy: req.user._id };

    const updatedCoupon = await Coupon.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCoupon) throw new AppError("Coupon not found", 404);

    // Invalidate coupons cache
    await cacheInvalidation.invalidateCoupons();

    res
      .status(200)
      .json({
        success: true,
        message: "Coupon updated successfully",
        data: updatedCoupon,
      });
  } catch (error) {
    next(error);
  }
}

// supprimer un coupon
async function deleteCoupon(req, res, next) {
  try {
    if (!req.user || !["admin", "seller"].includes(req.user.role)) {
      throw new AppError("Only sellers or admins can delete a coupons", 403);
    }

    const filter =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, createdBy: req.user._id };

    const deletedCoupon = await Coupon.findOneAndDelete(filter);

    if (!deletedCoupon) throw new AppError("Coupon not found", 404);

    // Invalidate coupons cache
    await cacheInvalidation.invalidateCoupons();

    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    next(error);
  }
}

export {
  createCoupon,
  getCouponsSeller,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
};
