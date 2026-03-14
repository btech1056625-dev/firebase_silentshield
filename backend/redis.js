const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Client Error', err));

// Initial connection
(async () => {
    try {
        await client.connect();
        console.log('✅ Connected to Redis');
    } catch (err) {
        console.error('❌ Could not connect to Redis', err);
    }
})();

module.exports = client;
