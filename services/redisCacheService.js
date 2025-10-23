import redis from '../config/redis.js';

class RedisCacheService {
    async get(key) {
        try {
            const data = await redis.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Redis GET error:', error);
            return null;
        }
    }

    async set(key, value, ttlSeconds = 300) {
        try {
            const serialized = JSON.stringify(value);
            if (ttlSeconds > 0) {
                await redis.setex(key, ttlSeconds, serialized);
            } else {
                await redis.set(key, serialized);
            }
            return true;
        } catch (error) {
            console.error('Redis SET error:', error);
            return false;
        }
    }

    async delete(key) {
        try {
            await redis.del(key);
            return true;
        } catch (error) {
            console.error('Redis DELETE error:', error);
            return false;
        }
    }

    async deleteByPattern(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
            return true;
        } catch (error) {
            console.error('Redis DELETE PATTERN error:', error);
            return false;
        }
    }

    async clear() {
        try {
            await redis.flushdb();
            return true;
        } catch (error) {
            console.error('Redis CLEAR error:', error);
            return false;
        }
    }
}

export default new RedisCacheService();
