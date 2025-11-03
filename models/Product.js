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


// Index simples
ProductSchema.index({ sellerId: 1 });
ProductSchema.index({ validationStatus: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ stock: 1 });
ProductSchema.index({ deletedAt: 1 });

// Index composé pour requêtes fréquentes
ProductSchema.index({ sellerId: 1, createdAt: -1 });
ProductSchema.index({ validationStatus: 1, isVisible: 1, deletedAt: 1 });

// Index text search pour recherche
ProductSchema.index({
    title: 'text',
    description: 'text'
}, {
    weights: {
        title: 10,
        description: 5
    },
    name: 'ProductTextIndex'
});
export default mongoose.model('Product', ProductSchema);
