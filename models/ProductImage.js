import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ProductImageSchema = new Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    imageUrl: {
        type: String,
        required: [true, 'Image URL is required']
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    collection: 'product_images',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

ProductImageSchema.index({ product: 1, deletedAt: 1 });
ProductImageSchema.index({ product: 1, isPrimary: 1 });

export default mongoose.model('ProductImage', ProductImageSchema);