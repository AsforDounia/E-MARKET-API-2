import Redis from 'ioredis';

const redisConfig = {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true
};

const redis = new Redis(redisConfig);

redis.on('connect', () => {
    console.log('Redis connected successfully');
});

redis.on('error', (error) => {
    console.error('Redis connection error:', error.message);
});

redis.on('ready', () => {
    console.log('Redis is ready to use');
});

export default redis;
