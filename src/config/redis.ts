import Redis from 'ioredis';
import { configDotenv } from 'dotenv';
configDotenv();


const client = new Redis(
//  process.env.REDIS_URL!
);

client.on('connect', () => {
  console.log('Connected to Redis');
});

client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export default client;
