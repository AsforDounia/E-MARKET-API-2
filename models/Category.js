import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
    name: {
        type: String,
        required: [true, 'the name of category is required'],
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    collection: 'categories',
    timestamps: true
});

export default mongoose.model('Category', CategorySchema);
