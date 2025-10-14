import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 }
    }
},{
    collection: 'token_blacklist',
    timestamps: true
});

export default mongoose.model('TokenBlacklist', tokenBlacklistSchema);