import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { enableProfiling } from './mongoProfiler.js';
dotenv.config();


const connectDB = async () => {
    try {
        const uri =
            process.env.NODE_ENV === "test" ? process.env.MONGO_URI_TEST : process.env.MONGO_URI;

        if (!uri) {
            throw new Error("Database URI not configured");
        }

        const conn = await mongoose.connect(uri, {
            maxPoolSize: 10,        // Max connections in pool
            minPoolSize: 2,         // Min connections in pool
            socketTimeoutMS: 45000, // Close sockets after 45s
            serverSelectionTimeoutMS: 10000, // Timeout after 10s (increased)
            family: 4,              // Use IPv4
        });

        const dbName = process.env.NODE_ENV === 'test' ? 'TEST' : 'PRODUCTION';
        
        if (process.env.NODE_ENV !== 'test') {
            await enableProfiling();
        }

        console.log(`${dbName} MongoDB Connected: ${conn.connection.host}`);
        console.log(`API is running at http://localhost:${process.env.PORT || 3000}`);
    } catch (error) {
        console.error(`Erreur de connexion MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
