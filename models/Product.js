import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ProductSchema = new Schema({
    sellerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Seller ID is required'] 
    },
    title: {
        type: String,
        required: [true, 'Title is required']
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        trim: [true, 'Description cannot be empty']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    stock: {
        type: Number,
        required: [true, 'Stock is required'],
        min: [0, 'Stock cannot be negative']
    },
    // seller: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true,
    // },
    imageUrls: {
        type: [String],
        default: []
    },
    isVisible: {
        type: Boolean,
        default: true,
    },
    isAvailable: {
        type: Boolean,
        default: true,
    },
    validationStatus: {
        type: String,
        enum: {
            values: ['pending', 'approved', 'rejected'],
            message: 'Validation status must be pending, approved, or rejected'
        },
        default: 'pending'
    },
    rejectionReason: {
        type: String,
        default: null
    },
    validatedAt: {
        type: Date,
        default: null
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    collection: 'products',
    timestamps: true
});

export default mongoose.model('Product', ProductSchema);
