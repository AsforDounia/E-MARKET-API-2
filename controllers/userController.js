import { User } from "../models/Index.js";
import {AppError} from "../middlewares/errorHandler.js";
import mongoose from 'mongoose';
const ObjectId = mongoose.Types.ObjectId;

async function getAllUsers(req, res, next) {
    try {
        const users = await User.find().select('-password');
        res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            data: {
                users: users
            }
        });
    } catch (err) {
        next(err);
    }
}

async function getUserById(req, res,next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);
        const user = await User.findById(id).select('-password');
        if (!user) throw new AppError("User not found", 404);
        res.status(200).json({
            success: true,
            message: 'User retrieved successfully',
            data: {
                user: user
            }
        });
    } catch (err) {
        next(err);
    }
}

async function createUser(req, res, next) {
    try {
        const { fullname, email, password } = req.body;
        if (!fullname || !email || !password) throw new AppError("Fullname, email, and password are required", 400);

        const existingUser = await User.findOne({ email, deletedAt: null });
        if (existingUser) throw new AppError("Email already in use", 400);

        const role = req.body.role || 'user';
        if (!['user', 'admin'].includes(role)) throw new AppError("Invalid role specified", 400);

        const user = await User.create({ fullname, email, password, role });
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: {
                user: user
            }
        });
    } catch (err) {
        next(err);
    }
}


async function deleteUser(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);
        const user = await User.findById(id);
        if (!user) throw new AppError("User not found", 404);
        user.deletedAt = new Date();
        await user.save();
        res.status(200).json({
            success: true,
            message: 'User soft-deleted',
            data: {
                user: user
            }
        });
    }
    catch (err) {
        next(err);
    }
}

 async function updateUserRole(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid user ID", 400);
        const { role } = req.body;
        if (!['user', 'seller', 'admin'].includes(role)) throw new AppError('Invalid role', 400);

        const user = await User.findByIdAndUpdate(
            id,
            { role },
            { new: true, runValidators: true }
        );
        if (!user) throw new AppError('User not found', 404);

        res.status(200).json({
            success: true,
            message: 'Role updated',
            data: {
                user: user
            }
        });
    } catch (error) {
        next(error);
    }
}

export { getAllUsers, getUserById, createUser, deleteUser, updateUserRole };
