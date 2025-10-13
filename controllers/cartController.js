import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { AppError } from '../middlewares/errorHandler.js';

export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    if (product.stock < quantity) throw new AppError('Insufficient stock', 400);

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const existingItem = cart.items.find(item => item.productId.toString() === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        productId,
        quantity,
        price: product.price
      });
    }

    await cart.save();
    
    res.status(200).json({
      message: 'Product added to cart successfully',
      cart
    });
  } catch (error) {
    next(error);
  }
};

export const getCart = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId }).populate('items.productId', 'title price stock imageUrls');

        if (!cart) {
            return res.status(200).json({
                message: 'Cart is empty',
                cart: { items: [], totalAmount: 0 }
            });
        }

        res.status(200).json({
            message: 'Cart retrieved successfully',
            cart
        });
    } catch (error) {
        next(error);
    }
};

export const removeFromCart = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) throw new AppError('Cart not found', 404);

        const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (itemIndex === -1) throw new AppError('Product not found in cart', 404);

        cart.items.splice(itemIndex, 1);
        await cart.save();

        res.status(200).json({
            message: 'Product removed from cart successfully',
            cart
        });
    } catch (error) {
        next(error);
    }
};

export const updateCartItem = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) throw new AppError('Cart not found', 404);

        const existingItem = cart.items.find(item => item.productId.toString() === productId);
        if (!existingItem) throw new AppError('Product not found in cart', 404);

        const product = await Product.findById(productId);
        if (product.stock < quantity) throw new AppError('Insufficient stock', 400);

        existingItem.quantity = quantity;
        await cart.save();

        res.status(200).json({
            message: 'Cart item updated successfully',
            cart
        });
    } catch (error) {
        next(error);
    }
};

export const clearCart = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId });
        if (!cart) throw new AppError('Cart not found', 404);

        cart.items = [];
        await cart.save();

        res.status(200).json({
            message: 'Cart cleared successfully',
            cart
        });
    } catch (error) {
        next(error);
    }
};