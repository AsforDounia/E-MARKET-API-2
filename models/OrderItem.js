import mongoose from "mongoose";


const orderItemSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productTitle: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    priceAtOrder: {
        type: Number,
        required: true
    }
}, {
    collection: "order_items",
    timestamps: true
});

export default mongoose.model('OrderItem', orderItemSchema);