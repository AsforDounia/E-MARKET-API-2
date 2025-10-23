import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

before(async function() {
    this.timeout(10000);

    const mongoUri = process.env.MONGO_URI_TEST;

    if (!mongoUri) {
        throw new Error('MONGO_URI_TEST environment variable is not set in .env file');
    }
    console.log('Connecting to MongoDB for tests...');
    
    try {
        await mongoose.connect(mongoUri);
        console.log('✓ Connected to MongoDB');
    } catch (error) {
        console.error('✗ Failed to connect to MongoDB:', error.message);
        throw error;
    }
});

after(async function() {
    console.log('Cleaning up test database...');
    try {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        console.log('✓ Database cleaned and connection closed');
    } catch (error) {
        console.error('✗ Error during cleanup:', error.message);
    }
});