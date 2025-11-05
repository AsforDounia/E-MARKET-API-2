import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkPerformance() {
    try {
        // Use localhost for Windows, works with Docker port mapping
        const mongoUri = process.env.MONGO_URI_LOCAL || 'mongodb://localhost:27017/emarket_3?directConnection=true';
        await mongoose.connect(mongoUri);
        
        console.log('📊 Checking MongoDB Performance...\n');
        
        // Check indexes
        const collections = ['products', 'users', 'orders', 'notifications'];
        
        for (const collName of collections) {
            console.log(`\n🔍 ${collName.toUpperCase()} Collection:`);
            const indexes = await mongoose.connection.db
                .collection(collName)
                .indexes();
            
            console.log(`   Indexes: ${indexes.length}`);
            indexes.forEach(idx => {
                console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
            });
        }
        
        // Check profiling status
        const result = await mongoose.connection.db.admin().command({ profile: -1 });
        console.log(`\n📈 Profiling Status: ${result.was === 1 ? '✅ Enabled' : '❌ Disabled'}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPerformance();