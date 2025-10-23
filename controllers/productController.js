import { Product, ProductCategory, Category , ProductImage} from '../models/Index.js';
import { getProductCategories } from '../services/productService.js';
import mongoose from 'mongoose';
import {AppError} from "../middlewares/errorHandler.js";
import notificationService from '../services/notificationService.js';
import cacheInvalidation from '../services/cacheInvalidation.js';
const ObjectId = mongoose.Types.ObjectId;

async function getAllProducts(req, res, next) {
    try {
        const { search, category, minPrice, maxPrice, inStock , sortBy, order, page = 1, limit = 10} = req.query;
        
        const filter = {
            // deletedAt: null,
            // validationStatus: 'approved',  
            // isVisible: true           
        };
        if (req.query.seller) filter.sellerId = req.query.seller;
        if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
        if (minPrice || maxPrice) filter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
        if (inStock === 'true') filter.stock = { $gt: 0 };
        
        if (category) {
            const isValidObjectId = mongoose.Types.ObjectId.isValid(category);
            const categoryDoc = isValidObjectId 
                ? await Category.findById(category)
                : await Category.findOne({ name: { $regex: category, $options: 'i' } });

            if (categoryDoc) {
                const productCategoryLinks = await ProductCategory.find({
                category: categoryDoc._id,
                });

                // Récupère tous les IDs de produits liés à cette catégorie
                const categoryProductIds = productCategoryLinks.map((pc) =>
                pc.product.toString()
                );

                //On ajoute directement le filtre dans la requête Mongo
                filter._id = { $in: categoryProductIds };
            }
        }

         //tri
        const sortOptions = {};

        // Choix du champ de tri selon le paramètre "sortBy"
        switch (sortBy) {
            case "price":
                sortOptions.price = order === "asc" ? 1 : -1;
                break;
            case "date":
                sortOptions.createdAt = order === "asc" ? 1 : -1;
                break;
            default:
                sortOptions.createdAt = -1;
        }

        //application du tri et pagination directement dans MongoDB
        const skip = (Number(page) - 1) * Number(limit);

        const filteredProducts = await Product.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit));
        
        //ajout des categories à chaque produit
        const results = await Promise.all(
            filteredProducts.map(async (product) => {
                const categories = await getProductCategories(product._id);
                return {
                    _id: product._id,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    imageUrls: product.imageUrls,
                    validationStatus: product.validationStatus,
                    isVisible: product.isVisible,
                    isAvailable: product.isAvailable,
                    createdAt: product.createdAt,
                    categories
                };
            })
        );


        const totalProducts = await Product.countDocuments(filter);

        // res.status(200).json(results);
        res.status(200).json({
            success: true,
            message: 'Products retrieved successfully',
            metadata: {
                total: totalProducts,
                currentPage: Number(page),
                totalPages: Math.ceil(totalProducts / Number(limit)),
                pageSize: Number(limit),
                hasNextPage: Number(page) < Math.ceil(totalProducts / Number(limit)),
                hasPreviousPage: Number(page) > 1
            },
            data: {
                products: results
            }
          
        });
    } catch (err) {
       next(err);
    }
}

async function getProductById(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);
        const product = await Product.findById(id);
        if (!product) throw new AppError("Product not found", 404);

        const categories = await getProductCategories(product._id);

        res.status(200).json({
            success: true,
            message: 'Product retrieved successfully',
            data: { product: {
                    _id: product._id,
                    title: product.title,
                    description: product.description,
                    price: product.price,
                    stock: product.stock,
                    imageUrls: product.imageUrls,
                    categories
                }
            }
        });
    } catch (err) {
        next(err);
    }
}

async function createProduct(req, res, next) {
  try {
    const sellerId = req.user?._id;
    const { title, description, price, stock, categoryIds } = req.body;

    // ======== VALIDATIONS ========
    if (!sellerId) throw new AppError("Seller information is required", 400);
    if (!title || !description || price == null || stock == null)
      throw new AppError("Title, description, price, and stock are required", 400);
    if (categoryIds && !Array.isArray(categoryIds))
      throw new AppError("categoryIds must be an array", 400);
    if (categoryIds && categoryIds.some(id => !ObjectId.isValid(id)))
      throw new AppError("Invalid category ID", 400);

    // ======== CREATE PRODUCT ========
    const product = await Product.create({
      title,
      description,
      price,
      stock,
      sellerId,
      imageUrls: [],
    });

    // ======== ADD CATEGORIES ========
    if (Array.isArray(categoryIds) && categoryIds.length > 0) {
      const categoryLinks = categoryIds.map(categoryId => ({
        product: product._id,
        category: categoryId,
      }));
      await ProductCategory.insertMany(categoryLinks);
    }

    // ======== HANDLE IMAGES ========
    if (req.files && req.files.length > 0) {
      const imageDocs = req.files.map((file, index) => ({
        product: product._id,
        imageUrl: `/uploads/products/${file.filename}`,
        isPrimary: index === 0,
      }));

      await ProductImage.insertMany(imageDocs);

      // Update imageUrls in product
      product.imageUrls = imageDocs.map(img => img.imageUrl);
      await product.save();
    }

    // ======== CLEAR CACHE ========
    await cacheInvalidation.invalidateProducts();

    // ======== RESPONSE ========
    res.status(201).json({
      success: true,
      message: "Product created successfully (awaiting admin validation)",
      data: product,
    });
  } catch (err) {
    next(err);
  }
}

async function updateProduct(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);
        const { title, description, price, stock, imageUrls, categoryIds } = req.body;

        if (categoryIds && !Array.isArray(categoryIds)) throw new AppError("categoryIds must be an array", 400);
        if (categoryIds && categoryIds.some(categoryId => !ObjectId.isValid(categoryId))) throw new AppError("Invalid category ID", 400);

        const product = await Product.findById(id);

        if (!product) throw new AppError("Product not found", 404);
        if (product.deletedAt) throw new AppError("Cannot update a deleted product", 400);

        if (req.user.role === "seller" && product.sellerId.toString() !== req.user._id.toString()) {
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
        // Invalidate products cache
        await cacheInvalidation.invalidateSpecificProduct(id);

        res.status(200).json({
            success: true,
            message: 'Product updated',
            data: {
                product: product
            }
        });
    } catch (err) {
        next(err);
    }
}

async function deleteProduct(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);
        const product = await Product.findById(id);

        if (!product) throw new AppError("Product not found", 404);
        if (product.deletedAt) throw new AppError("Product already deleted", 400);

        product.deletedAt = new Date();
        await product.save();

        // mark related ProductCategory entries as deleted
        await ProductCategory.updateMany(
            { product: product._id },
            { $set: { deletedAt: new Date() } }
        );
        // Invalidate products cache
        await cacheInvalidation.invalidateSpecificProduct(id);

        res.status(200).json({
            success: true,
            message: 'Product soft-deleted',
            data: {
                product: product
            }
        });
    } catch (err) {
        next(err);
    }
}

async function updateProductVisibility (req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);
        const { isVisible } = req.body;
      
        if (typeof isVisible !== 'boolean') {
            throw new AppError('isVisible must be a boolean', 400);
        }

        const product = await Product.findOne({
            _id: id,
            deletedAt: null
        });

        if (!product) throw new AppError('Product not found', 404);

        if (req.user.role === "seller" && product.sellerId.toString() !== req.user._id.toString()) {
            throw new AppError('You are not authorized to update this product', 403);
        }

        product.isVisible = isVisible;
        await product.save();

        // Invalidate products cache
        await cacheInvalidation.invalidateSpecificProduct(id);

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
        }).populate('sellerId', 'fullname email');
        
        res.json(products);
    } catch (error) {
        next(error);
    }
}


async function validateProduct(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);
        const product = await Product.findOne({
            _id: id,
            deletedAt: null
        });

        if (!product) throw new AppError('Product not found', 404);

        // Approve the product
        product.validationStatus = 'approved';
        product.isVisible = true;
        product.isAvailable = true;
        product.validatedAt = new Date();
        
        await product.save();

        notificationService.emitPublishProduct({
            productId: product._id,
            title: product.title,
            sellerId: product.sellerId
        });

        // Invalidate products cache
        await cacheInvalidation.invalidateProducts();

        res.json({ message: 'Product approved successfully', product });
    } catch (error) {
        next(error);
    }
}

async function rejectProduct(req, res, next) {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) throw new AppError("Invalid product ID", 400);
        const { reason } = req.body;
        
        const product = await Product.findOne({
            _id: id,
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

        // Invalidate products cache
        await cacheInvalidation.invalidateProducts();

        res.json({
            message: 'Product rejected successfully',
            product
        });
    } catch (error) {
        next(error);
    }
}


export { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct, updateProductVisibility, getPendingProducts, validateProduct, rejectProduct };
