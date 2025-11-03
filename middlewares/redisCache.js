import redisCacheService from '../services/redisCacheService.js';
import redis from '../config/redis.js';

const cache = (keyPrefix, ttlSeconds = 300) => {
    return async (req, res, next) => {
        try {
            // generate cache key based on request URL and prefix
            const cacheKey = `${keyPrefix}:${req.originalUrl}`;

            // Check if data is cached
            const cachedData = await redisCacheService.get(cacheKey);
            
            if (cachedData) {
                // ✅ Increment cache hits
                await redis.incr('cache:hits').catch(err => console.error('Redis incr error:', err));
                
                return res.json({
                    ...cachedData,
                    fromCache: true
                });
            }
            
            // ✅ Increment cache misses
            await redis.incr('cache:misses').catch(err => console.error('Redis incr error:', err));
            
            // Override res.json to cache the response data
            const originalJson = res.json;
            res.json = function(data) {
                // Cache only 200 responses
                if (res.statusCode === 200) {
                    redisCacheService.set(cacheKey, data, ttlSeconds);
                }
                return originalJson.call(this, data);
            };
            
            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
};

export default cache;
