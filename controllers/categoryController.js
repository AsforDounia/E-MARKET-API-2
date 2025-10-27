import mongoose from "mongoose";
import { AppError } from "../middlewares/errorHandler.js";
import { Category } from "../models/Index.js";
import cacheInvalidation from '../services/cacheInvalidation.js';
const ObjectId = mongoose.Types.ObjectId;

async function getAllCategories(req, res, next){
    try {
        const categories = await Category.find();
        return res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            data: {
                categories: categories
            }
        });
    } catch (err) {
        next(err);
    }
}

async function getCategoryById(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid category ID", 400);
        const category = await Category.findById(id);
        if (!category) throw new AppError("Category not found", 404);
        res.status(200).json({
            success: true,
            message: 'Category retrieved successfully',
            data: {
                category: category
            }
        });
    } catch (err) {
        next(err)
    }
}

async function createCategory(req, res, next) {
    try {
        const { name, description } = req.body;

        if (!name || !description) throw new AppError("Name and Description are required", 400);

        const existingCat = await Category.findOne({ name });
        if (existingCat) throw new AppError("Name already in use", 400);

        const category = await Category.create({ name, description });

        // Invalidate categories cache
        await cacheInvalidation.invalidateCategories();

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: {
                category: category
            }
        });
    } catch (err) {
        next(err)
    }
}


async function updateCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid category ID", 400);
        let { name, description } = req.body;

        const category = await Category.findById(id);
        if (!category) throw new AppError("Category not found", 404);

        if (name) {

            name = name.trim();
            if (!name) throw new AppError("Name cannot be empty", 400);

            const existingCat = await Category.findOne({ name });
            if (existingCat && existingCat._id.toString() !== id) throw new AppError("Name already in use", 400);
            
            category.name = name;
        }
        if (description) {
            description = description.trim();

            if (!description) throw new AppError("Description cannot be empty", 404);

            category.description = description;
        }

        await category.save();

        // Invalidate categories cache
        await cacheInvalidation.invalidateSpecificCategory(id);

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: {
                category: category
            }
        });
    } catch (err) {
        next(err);
    }
}

async function deleteCategory(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid category ID", 400);
        const category = await Category.findById(id);
        if (!category) throw new AppError("Category not found", 404);

        category.deletedAt = new Date();
        await category.save();

        // Invalidate categories cache
        await cacheInvalidation.invalidateSpecificCategory(id);

        res.status(200).json({
            success: true,
            message: 'Category soft-deleted successfully'
        });
    } catch (err) {
        next(err);
    }
}
export { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory }