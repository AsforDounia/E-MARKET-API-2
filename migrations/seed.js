import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { faker } from '@faker-js/faker';
import { Product, Category, ProductCategory, User } from '../models/Index.js';

dotenv.config();

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');

    const users = [];

    //admin
    const admin = await User.create({
      fullname: 'Admin User',
      email: 'admin@gmail.com',
      password: 'admin123',
      role: 'admin'
    });
    users.push(admin);

    // 5 users aléatoires
    for (let i = 0; i < 5; i++) {
      const user = await User.create({
        fullname: faker.person.fullName(),
        email: faker.internet.email(),
        password: 'user123',
        role: 'user'
      });
      users.push(user);
    }
    console.log(`Inserted ${users.length} users`);

    //cartegories
    const categoryNames = [
      'Electronics',
      'Clothing',
      'Books',
      'Home & Garden',
      'Sports',
      'Beauty'
    ];

    const categories = await Category.insertMany(
      categoryNames.map((name) => ({
        name,
        description: faker.lorem.sentence()
      }))
    );
    console.log(`Inserted ${categories.length} categories`);

    //products
    const adminUser = users.find((u) => u.role === 'admin');
    const products = [];

    for (let i = 0; i < 10; i++) {
      const product = await Product.create({
        title: faker.commerce.productName(),
        description: faker.commerce.productDescription(),
        price: faker.commerce.price({ min: 10, max: 1000, dec: 2 }),
        stock: faker.number.int({ min: 10, max: 200 }),
        imageUrls: [faker.image.url()],
        sellerId: adminUser._id
      });

      // assigner entre 1 et 2 catégories
      const randomCategories = faker.helpers.arrayElements(categories, faker.number.int({ min: 1, max: 2 }));

      for (const cat of randomCategories) {
        await ProductCategory.create({
          product: product._id,
          category: cat._id
        });
      }

      products.push(product);
    }
    console.log(`Inserted ${products.length} products with category relationships`);

    console.log('Database seeded successfully!');
    // process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    // process.exit(1);
  }
}

export default seedDatabase;

// Si on exécute ce fichier directement avec `node seed.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}