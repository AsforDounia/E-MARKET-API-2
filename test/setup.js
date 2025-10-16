import mongoose from 'mongoose';

after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
});
