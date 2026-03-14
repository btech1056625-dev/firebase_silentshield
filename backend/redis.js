const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.warn('⚠️ Redis: Max retries reached. Will try again in 5 minutes.');
                return 300000; // 5 minutes
            }
            return Math.min(retries * 100, 3000);
        }
    }
});

let isReady = false;

client.on('connect', () => {
    console.log('📡 Redis: Connecting...');
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ Redis: Ready and Connected');
});

client.on('error', (err) => {
    isReady = false;
    // Log only critical errors, avoid spamming connection refused
    if (err.code !== 'ECONNREFUSED') {
        console.error('❌ Redis: Client Error', err);
    }
});

client.on('end', () => {
    isReady = false;
    console.warn('⚠️ Redis: Connection closed');
});

// Initial connection
(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error('❌ Redis: Initial connection failed. Application will run without cache.');
    }
})();

// Helper to check if redis should be used
client.isAvailable = () => isReady && client.isOpen;

module.exports = client;
