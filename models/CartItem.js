import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
    cartId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
},{
    collection: 'cart_items',
    timestamps: true
});

// Index composé pour optimiser les requêtes
cartItemSchema.index({ cartId: 1, productId: 1 }, { unique: true });

export default mongoose.model('CartItem', cartItemSchema);
