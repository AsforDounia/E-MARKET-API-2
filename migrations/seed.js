import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product, Category, ProductCategory, User } from '../models/Index.js';

dotenv.config();

const seedData = {
    users: [
        {
            fullname: "Admin User",
            email: "admin@gmail.com",
            password: "admin123",
            role: "admin"
        },
        {
            fullname: "John Doe",
            email: "john@gmail.com",
            password: "user123",
            role: "user"
        }
    ],
    categories: [
        { name: "Electronics", description: "Electronic devices and gadgets" },
        { name: "Clothing", description: "Fashion and apparel" },
        { name: "Books", description: "Books and literature" },
        { name: "Home & Garden", description: "Home improvement and gardening" }
    ],
    products: [
        {
            title: "Smartphone Pro",
            description: "Latest smartphone with advanced features",
            price: 699.99,
            stock: 50,
            imageUrl: "https://example.com/smartphone.jpg",
            categories: ["Electronics"]
        },
        {
            title: "Wireless Headphones",
            description: "High-quality wireless headphones",
            price: 199.99,
            stock: 30,
            imageUrl: "https://example.com/headphones.jpg",
            categories: ["Electronics"]
        },
        {
            title: "Cotton T-Shirt",
            description: "Comfortable cotton t-shirt",
            price: 29.99,
            stock: 100,
            imageUrl: "https://example.com/tshirt.jpg",
            categories: ["Clothing"]
        },
        {
            title: "Programming Guide",
            description: "Complete guide to modern programming",
            price: 49.99,
            stock: 25,
            imageUrl: "https://example.com/book.jpg",
            categories: ["Books"]
        }
    ]
};

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to database');

        // Clear existing data
        // await User.deleteMany({});
        // await Category.deleteMany({});
        // await Product.deleteMany({});
        // await ProductCategory.deleteMany({});
        // console.log('Cleared existing data');

        // Insert users
        const users = [];
        for (const userData of seedData.users) {
            const user = await User.create(userData);
            users.push(user);
        }
        console.log(`✓ Inserted ${users.length} users`);

        // Insert categories
        const categories = await Category.insertMany(seedData.categories);
        console.log(`✓ Inserted ${categories.length} categories`);

        // Insert products and create category relationships
        for (const productData of seedData.products) {
            const { categories: categoryNames, ...productInfo } = productData;
            
            const product = await Product.create(productInfo);
            
            for (const categoryName of categoryNames) {
                const category = categories.find(c => c.name === categoryName);
                if (category) {
                    await ProductCategory.create({
                        product: product._id,
                        category: category._id
                    });
                }
            }
        }
        console.log(`✓ Inserted ${seedData.products.length} products with category relationships`);

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();