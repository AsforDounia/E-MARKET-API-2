import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async () => {
    try {
       const uri = process.env.NODE_ENV === 'test' ? process.env.MONGO_URI_TEST : process.env.MONGO_URI;

        if (!uri) {
            throw new Error('Database URI not configured');
        }

        const conn = await mongoose.connect(uri);

        const dbName = process.env.NODE_ENV === 'test' ? 'TEST' : 'PRODUCTION';

        console.log(`${dbName} MongoDB Connected: ${conn.connection.host}`);
        console.log(`API is running at http://localhost:${process.env.PORT || 3000}`);
    } catch (error) {
        console.error(`Erreur de connexion MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;