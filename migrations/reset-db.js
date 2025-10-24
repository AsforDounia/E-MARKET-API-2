// seeds/reset-db.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Category, Product, ProductCategory } from '../models/Index.js';
import seedDatabase from './seed.js';

dotenv.config();

async function resetDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    // Vider toutes les collections
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      ProductCategory.deleteMany({})
    ]);
    console.log('Cleared all collections');

    // Relancer le seed
    await seedDatabase();
    console.log('Database reset completed');

    await mongoose.disconnect();
  } catch (err) {
    console.error('Reset failed:', err);
    process.exit(1);
  }
}

resetDatabase();
