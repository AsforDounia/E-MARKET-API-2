import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

before(async () => {
    if (process.env.NODE_ENV !== 'test:unit') {
        await mongoose.connect(process.env.MONGO_URI_TEST);
    }
});

after(async () => {
    if (process.env.NODE_ENV !== 'test:unit') {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    }
});
