import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
  },
}, {
    collection: 'carts',
    timestamps: true
});

export default mongoose.model('Cart', cartSchema);