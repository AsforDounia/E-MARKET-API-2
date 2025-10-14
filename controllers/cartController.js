import { Product, Cart, CartItem } from '../models/Index.js';
import { AppError } from '../middlewares/errorHandler.js';


// Fonctions utilitaires
const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId });
    return cart;
};

const getExistingCart = async (userId) => {
    const cart = await Cart.findOne({ userId });
    if (!cart) throw new AppError('Cart not found', 404);
    return cart;
};

const buildCartResponse = async (cart) => {
    const items = await CartItem.find({ cartId: cart._id }).populate('productId', 'title description stock imageUrls');
    const totalAmount = items.reduce((total, item) => total + (item.priceAtAdd * item.quantity), 0);
    return { ...cart.toObject(), items, totalAmount };
};


export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.id;

    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);

    if (product.stock < quantity) throw new AppError('Insufficient stock', 400);

    const cart = await getOrCreateCart(userId);

    const cartId = cart._id;
    const existingItem = await CartItem.findOne({ cartId, productId });
    
    if (existingItem) {
        await CartItem.updateOne(
            { cartId, productId },
            { $inc: { quantity: quantity } }
        );
    } else {
        await CartItem.create({
            cartId,
            productId,
            quantity,
            priceAtAdd: product.price
      });
    }

      const cartData = await buildCartResponse(cart);

      res.status(200).json({
          message: 'Product added to cart successfully',
          cart: cartData
      });
  } catch (error) {
    next(error);
  }
};

export const getCart = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ userId });

        if (!cart) {
            return res.status(200).json({
                message: 'Cart is empty',
                cart: { items: [], totalAmount: 0 }
            });
        }

        const cartData = await buildCartResponse(cart);

        res.status(200).json({
            message: 'Cart retrieved successfully',
            cart: cartData
        });
    } catch (error) {
        next(error);
    }
};

export const removeFromCart = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const cart = await getExistingCart(userId);

        const deleted = await CartItem.deleteOne({ cartId: cart._id, productId });
        if (deleted.deletedCount === 0) throw new AppError('Product not found in cart', 404);

        const cartData = await buildCartResponse(cart);

        res.status(200).json({
            message: 'Product removed from cart successfully',
            cart: cartData
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

        const cart = await getExistingCart(userId);

        const product = await Product.findById(productId);
        if (product.stock < quantity) throw new AppError('Insufficient stock', 400);

        const updated = await CartItem.updateOne(
            { cartId: cart._id, productId },
            { quantity }
        );
        if (updated.matchedCount === 0) throw new AppError('Product not found in cart', 404);

        const cartData = await buildCartResponse(cart);

        res.status(200).json({
            message: 'Cart item updated successfully',
            cart: cartData
        });
    } catch (error) {
        next(error);
    }
};

export const clearCart = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const cart = await getExistingCart(userId);

        await CartItem.deleteMany({ cartId: cart._id });

        res.status(200).json({
            message: 'Cart cleared successfully',
            cart: cart
        });
    } catch (error) {
        next(error);
    }
};