import redisCacheService from '../services/redisCacheService.js';

const cache = (keyPrefix, ttlSeconds = 300) => {
    return async (req, res, next) => {
        try {
            // generate cache key based on request URL and prefix
            const cacheKey = `${keyPrefix}:${req.originalUrl}`;

            // Check if data is cached
            const cachedData = await redisCacheService.get(cacheKey);
            
            if (cachedData) {
                return res.json(cachedData);
            }
            
            
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
