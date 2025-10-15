import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrations = [
    {
        version: 1,
        name: 'create_users_collection',
        up: async () => {
            await mongoose.connection.db.createCollection('users');
            await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true });
        }
    },
    {
        version: 2,
        name: 'create_categories_collection',
        up: async () => {
            await mongoose.connection.db.createCollection('categories');
            await mongoose.connection.db.collection('categories').createIndex({ name: 1 }, { unique: true });
        }
    },
    {
        version: 3,
        name: 'create_products_collection',
        up: async () => {
            await mongoose.connection.db.createCollection('products');
        }
    },
    {
        version: 4,
        name: 'create_product_categories_collection',
        up: async () => {
            await mongoose.connection.db.createCollection('product_categories');
        }
    }
];

async function runMigrations() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const migrationCollection = mongoose.connection.db.collection('migrations');
        
        for (const migration of migrations) {
            const exists = await migrationCollection.findOne({ version: migration.version });
            
            if (!exists) {
                console.log(`Running migration: ${migration.name}`);
                await migration.up();
                await migrationCollection.insertOne({
                    version: migration.version,
                    name: migration.name,
                    executedAt: new Date()
                });
                console.log(`✓ Migration ${migration.name} completed`);
            }
        }
        
        console.log('All migrations completed');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();