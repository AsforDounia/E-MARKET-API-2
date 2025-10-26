import jwt from "jsonwebtoken";
import { User, TokenBlacklist } from "../models/Index.js";
import { AppError } from "./errorHandler.js";

export const authenticate = async (req, res, next) => {
  try {
    const token =
      req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.token;
    if (!token) throw new AppError("Access denied. No token provided.", 401);

    const blacklistedToken = await TokenBlacklist.findOne({ token });
    if (blacklistedToken)
      throw new AppError("Token has been invalidated.", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new AppError("Invalid token.", 401);

    req.user = user;
    next();
  } catch (error) {
    // next(new AppError("Invalid token.", 401));
    return res.status(401).json({
      status: 401,
      message: "Invalid token.",
    });
  }
};

export const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("User not authenticated", 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("Access denied. Insufficient permissions.", 403)
      );
    }
    next();
  };
};
