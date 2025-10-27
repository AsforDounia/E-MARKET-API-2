import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // couponId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Coupon',
    //     default: null
    // },
    subtotal: {
        type: Number,
        required: true
    },
    discount: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    }
}, {
    collection: 'orders',
    timestamps: true
});


export default mongoose.model('Order', orderSchema);