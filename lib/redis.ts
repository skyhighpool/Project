import Redis from 'redis';

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));

export const redis = redisClient;

// Connect to Redis
if (!redisClient.isOpen) {
  redisClient.connect().catch(console.error);
}