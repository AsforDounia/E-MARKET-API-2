import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        console.log(`API is running at http://localhost:${process.env.PORT || 3000}`);
    } catch (error) {
        console.error(`Erreur de connexion MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;