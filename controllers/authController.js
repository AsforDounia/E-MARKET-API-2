import jwt from 'jsonwebtoken';
import { User, TokenBlacklist } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';

export const register = async (req, res, next) => {
    try {
        const { fullname, email, password, passwordConfirmation, role } = req.body;
        if (password !== passwordConfirmation) {
            throw new AppError('Password and password confirmation do not match', 400);
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new AppError('Email already in use', 400);

        const userCount = await User.countDocuments();

        let userRole;
        if (userCount === 0) {
            userRole = 'admin';
        } else if (role === 'seller' || role === 'user') {
            userRole = role;
        } else {
            userRole = 'user';
        }
        
        const user = await User.create({ fullname, email, password, role: userRole });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: { 
                    id: user._id, 
                    fullname: user.fullname, 
                    email: user.email, 
                    role: user.role 
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) throw new AppError('Email and password are required', 400);

        const user = await User.findOne({ email, deletedAt: null });
        if (!user || !(await user.comparePassword(password))) {
            throw new AppError('Invalid email or password', 401);
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            success: true,
            message: 'Logged in successfully',
            data: {
                token,
                user: {
                    id: user._id,
                    fullname: user.fullname,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
        if (!token) throw new AppError('No token provided', 401);

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        await TokenBlacklist.create({
            token,
            expiresAt: new Date(decoded.exp * 1000)
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        next(error);
    }
};