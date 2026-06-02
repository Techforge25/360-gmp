const Redis = require('ioredis');

// Redis configuration options
const redisConfigOptions = {
    host: process.env.REDIS_HOST, 
    port: process.env.REDIS_PORT,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD    
};

// Redis instance
const redis = new Redis(redisConfigOptions);

// Error
redis.on('error', (error) => console.error('Failed to connect with Redis', error.message));

// Connect
redis.on('connect', () => console.log('Connected to Redis'));

module.exports = { redisConfigOptions, redis };