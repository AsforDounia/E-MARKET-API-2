import mongoose from 'mongoose';

export async function enableProfiling() {
    try {
        // Skip profiling in production environments
        if (process.env.NODE_ENV === 'production' || process.env.MONGO_URI?.includes('mongodb.net')) {
            console.log('MongoDB Profiling skipped in production environment.');
            return;
        }
        
        const db = mongoose.connection.db;
        
        // Enable profiling level 1 (slow queries > 100ms)
        await db.command({ 
            profile: 1, 
            slowms: 100 
        });
        
        console.log('✅ MongoDB Profiling enabled (slowms: 100ms)');
    } catch (error) {
        console.error('❌ Failed to enable MongoDB profiling:', error);
    }
}

export async function getSlowQueries(limit = 10) {
    try {
        const db = mongoose.connection.db;
        const profile = db.collection('system.profile');
        
        const slowQueries = await profile
            .find({ millis: { $gt: 100 } })
            .sort({ ts: -1 })
            .limit(limit)
            .toArray();
        
        return slowQueries;
    } catch (error) {
        console.error('Error fetching slow queries:', error);
        return [];
    }
}

export async function analyzeIndexUsage() {
    try {
        const collections = ['products', 'users', 'orders', 'notifications'];
        const results = {};
        
        for (const collName of collections) {
            const stats = await mongoose.connection.db
                .collection(collName)
                .aggregate([
                    { $indexStats: {} }
                ])
                .toArray();
            
            results[collName] = stats;
        }
        
        return results;
    } catch (error) {
        console.error('Error analyzing index usage:', error);
        return {};
    }
}