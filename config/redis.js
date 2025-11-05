import Redis from "ioredis";

// Check if Redis URL is provided (for Upstash or Heroku Redis)
const redisUrl = process.env.UPSTASH_REDIS_URL || process.env.REDIS_URL;

let redis;

if (redisUrl) {
    // Use connection URL if provided
    redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 10000,
    });
} else {
    // Fallback to individual config (for local development)
    redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        enableOfflineQueue: false,
    });
}

redis.on("connect", () => {
    console.log("Redis connected successfully");
});

redis.on("error", (error) => {
    console.error("Redis connection error:", error.message);
});

redis.on("ready", () => {
    console.log("Redis is ready to use");
});

export default redis;
