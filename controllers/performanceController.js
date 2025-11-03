import mongoose from 'mongoose';
import redis from '../config/redis.js';
import { getSlowQueries, analyzeIndexUsage } from '../config/mongoProfiler.js';

// Middleware pour tracker response time
export const trackResponseTime = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const key = `response_time:${req.method}:${req.route?.path || req.path}`;
        
        // Store in Redis with sliding window
        redis.lpush(key, duration);
        redis.ltrim(key, 0, 99); // Keep last 100 requests
        redis.expire(key, 3600); // 1 hour TTL
    });
    
    next();
};

export const getPerformanceStats = async (req, res, next) => {
    try {
        // 1. Average Response Time
        const keys = await redis.keys('response_time:*');
        let totalResponseTime = 0;
        let requestCount = 0;
        
        for (const key of keys) {
            const times = await redis.lrange(key, 0, -1);
            times.forEach(time => {
                totalResponseTime += parseInt(time);
                requestCount++;
            });
        }
        
        const avgResponseTime = requestCount > 0 
            ? (totalResponseTime / requestCount).toFixed(2) 
            : 0;

        // 2. Cache Hit Rate
        const cacheHits = await redis.get('cache:hits') || 0;
        const cacheMisses = await redis.get('cache:misses') || 0;
        const totalCacheRequests = parseInt(cacheHits) + parseInt(cacheMisses);
        const cacheHitRate = totalCacheRequests > 0 
            ? ((parseInt(cacheHits) / totalCacheRequests) * 100).toFixed(2) 
            : 0;

        // 3. Database Query Time (from profiler)
        const slowQueries = await getSlowQueries(10);
        const avgDbQueryTime = slowQueries.length > 0
            ? (slowQueries.reduce((sum, q) => sum + q.millis, 0) / slowQueries.length).toFixed(2)
            : 0;

        // 4. Memory Usage
        const memUsage = process.memoryUsage();
        const memoryUsage = {
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
        };

        // 5. MongoDB Connection Pool
        const dbStats = mongoose.connection.db.stats();
        
        // 6. Index Usage Analysis
        const indexUsage = await analyzeIndexUsage();

        res.json({
            success: true,
            timestamp: new Date(),
            performance: {
                responseTime: {
                    average: `${avgResponseTime} ms`,
                    totalRequests: requestCount
                },
                cache: {
                    hitRate: `${cacheHitRate}%`,
                    hits: parseInt(cacheHits),
                    misses: parseInt(cacheMisses)
                },
                database: {
                    avgQueryTime: `${avgDbQueryTime} ms`,
                    slowQueriesCount: slowQueries.length,
                    connectionPool: {
                        current: mongoose.connection.readyState,
                        poolSize: mongoose.connection.client?.s?.options?.maxPoolSize || 10
                    }
                },
                memory: memoryUsage,
                indexUsage: indexUsage
            },
            slowQueries: slowQueries.map(q => ({
                operation: q.op,
                namespace: q.ns,
                duration: `${q.millis} ms`,
                timestamp: q.ts,
                query: q.command
            }))
        });
    } catch (error) {
        next(error);
    }
};

// Reset cache stats
export const resetCacheStats = async (req, res, next) => {
    try {
        await redis.set('cache:hits', 0);
        await redis.set('cache:misses', 0);
        
        res.json({
            success: true,
            message: 'Cache statistics reset successfully'
        });
    } catch (error) {
        next(error);
    }
};
