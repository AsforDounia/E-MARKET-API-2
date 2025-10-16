import { Product, ProductCategory, Category } from '../models/Index.js';
import { getProductCategories } from '../services/productService.js';
import mongoose from 'mongoose';
import {AppError} from "../middlewares/errorHandler.js";


async function getAllProducts(req, res, next) {
    try {
        const { search, category, minPrice, maxPrice, inStock } = req.query;
        
        const filter = {
            deletedAt: null,
            validationStatus: 'approved',  
            isVisible: true           
        };
        if (req.query.seller) filter.seller = req.query.seller;
        if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
        if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
        if (inStock === 'true') filter.stock = { $gt: 0 };
        
        let products = await Product.find(filter);
        
        if (category) {
            const isValidObjectId = mongoose.Types.ObjectId.isValid(category);
            const categoryDoc = isValidObjectId 
                ? await Category.findById(category)
                : await Category.findOne({ name: { $regex: category, $options: 'i' } });
            
            if (categoryDoc) {
                const categoryProducts = await ProductCategory.find({ category: categoryDoc._id }).populate('product');
                const categoryProductIds = categoryProducts.map(pc => pc.product._id.toString());
                products = products.filter(p => categoryProductIds.includes(p._id.toString()));
            }
        }

        const results = await Promise.all(
            products.map(async (product) => {
                const categories = await getProductCategories(product._id);
                return {
                    _id: product._id,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    imageUrls: product.imageUrls,
                    categories
                };
            })
        );

        res.status(200).json(results);
    } catch (err) {
       next(err);
    }
}

async function getProductById(req, res, next) {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) throw new AppError("Product not found", 404);

        const categories = await getProductCategories(product._id);

        res.status(200).json({
            _id: product._id,
            title: product.title,
            description: product.description,
            price: product.price,
            stock: product.stock,
            imageUrls: product.imageUrls,
            categories
        });
    } catch (err) {
        next(err);
    }
}

async function createProduct(req, res, next) {
    try {
        const sellerId = req.user._id; 
        const { title, description, price, stock, imageUrls, categoryIds } = req.body;
        if (!title || !description || price == null || stock == null) throw new AppError("Title, description, price, and stock are required", 400);
        if (!sellerId) throw new AppError("Seller information is required", 400);
 
        const product = await Product.create({ title, description, price, stock, imageUrls, seller: sellerId });
       
        if (Array.isArray(categoryIds)) {
            for (const categoryId of categoryIds) {
                await ProductCategory.create({ product: product._id, category: categoryId });
            }
        }

        res.status(201).json({ message: 'Product created', data: product });
    } catch (err) {
        next(err);
    }
}



async function updateProduct(req, res, next) {
    try {
        const { id } = req.params;
        const { title, description, price, stock, imageUrls, categoryIds } = req.body;
        const product = await Product.findById(id);

        if (!product) throw new AppError("Product not found", 404);

        if (req.user.role === "seller" && product.seller.toString() !== req.user._id.toString()) {
            throw new AppError("You are not authorized to update this product", 403);
        }

        if (title) product.title = title;
        if (description) product.description = description;
        if (price != null) product.price = price;
        if (stock != null) product.stock = stock;
        if (imageUrls) product.imageUrls = imageUrls;

        await product.save();

        if (Array.isArray(categoryIds)) {
            await ProductCategory.deleteMany({ product: product._id });
            for (const categoryId of categoryIds) {
                await ProductCategory.create({ product: product._id, category: categoryId });
            }
        }
        res.status(200).json({ message: 'Product updated', data: product });
    } catch (err) {
        next(err);
    }
}

async function deleteProduct(req, res, next) {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) throw new AppError("Product not found", 404);

        product.deletedAt = new Date();
        await product.save();

        // mark related ProductCategory entries as deleted
        await ProductCategory.updateMany(
            { product: product._id },
            { $set: { deletedAt: new Date() } }
        );
        res.status(200).json({ message: 'Product deleted' });
    } catch (err) {
        next(err);
    }
}

async function updateProductVisibility (req, res, next) {
    try {
        const { isVisible } = req.body;
      
        if (typeof isVisible !== 'boolean') {
            throw new AppError('isVisible must be a boolean', 400);
        }

        const product = await Product.findOne({
            _id: req.params.id,
            deletedAt: null
        });

        if (!product) throw new AppError('Product not found', 404);

        if (req.user.role === "seller" && product.seller.toString() !== req.user._id.toString()) {
            throw new AppError('You are not authorized to update this product', 403);
        }

        product.isVisible = isVisible;
        await product.save();

        res.json({
            message: `Product ${isVisible ? 'shown' : 'hidden'} successfully`,
            product
        });
    } catch (error) {
        next(error);
    }
}

async function getPendingProducts(req, res, next) {
    try {
        const products = await Product.find({
            validationStatus: 'pending',
            deletedAt: null
        }).populate('seller', 'fullname email');
        
        res.json(products);
    } catch (error) {
        next(error);
    }
}


async function validateProduct(req, res, next) {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            deletedAt: null
        });

        if (!product) throw new AppError('Product not found', 404);

        // Approve the product
        product.validationStatus = 'approved';
        product.isVisible = true;
        product.isAvailable = true;
        product.validatedAt = new Date();
        
        await product.save();

        res.json({ message: 'Product approved successfully', product });
    } catch (error) {
        next(error);
    }
}

async function rejectProduct(req, res, next) {
    try {
        const { reason } = req.body;
        
        const product = await Product.findOne({
            _id: req.params.id,
            deletedAt: null
        });

        if (!product) throw new AppError('Product not found', 404);

        // Reject the product
        product.validationStatus = 'rejected';
        product.isVisible = false;
        product.isAvailable = false;
        product.rejectionReason = reason;
        product.validatedAt = new Date();
        
        await product.save();

        res.json({
            message: 'Product rejected successfully',
            product
        });
    } catch (error) {
        next(error);
    }
}


export { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, updateProductVisibility, getPendingProducts, validateProduct, rejectProduct };
