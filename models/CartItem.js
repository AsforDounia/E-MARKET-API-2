import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    priceAtAdd: { type: Number, required: true, min: 0 },
    addedAt: { type: Date, default: Date.now }
});

export default mongoose.model('CartItem', cartItemSchema);
