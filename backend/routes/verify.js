const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../db');
const redis = require('../redis');

const JWT_SECRET = process.env.JWT_SECRET;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

// Endpoint: Initial Passive Verification
router.post('/verify', async (req, res) => {
    const payload = req.body;

    try {
        if (!payload.session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }

        // 1. Pre-Verification Check (Redis Cache)
        if (redis.isAvailable()) {
            const cachedResult = await redis.get(`session:${payload.session_id}`);
            if (cachedResult) {
                const data = JSON.parse(cachedResult);
                console.log(`⚡ Cache Hit for session: ${payload.session_id}`);
                return res.json({
                    ...data,
                    source: 'CACHE'
                });
            }
        }

        // 2. Send feature payload to Python ML service
        const mlResponse = await axios.post(ML_SERVICE_URL, payload);
        const humanScore = mlResponse.data.confidence;

        // Threshold Logic
        let decision = 'BLOCK';
        let trustToken = null;

        if (humanScore >= 0.80) {
            decision = 'ALLOW';
            trustToken = jwt.sign(
                { session_id: payload.session_id, status: 'HUMAN' },
                JWT_SECRET,
                { expiresIn: '1h' }
            );
        } else if (humanScore >= 0.50) {
            decision = 'FALLBACK';
        }

        // Log to Database
        await db.execute(
            `INSERT INTO verification_logs 
            (session_id, domain, human_score, decision, fallback_passed)
            VALUES (?, ?, ?, ?, ?)`,
            [
                payload.session_id,
                payload.domain || 'enterprise-portal.com',
                humanScore,
                decision,
                decision === 'ALLOW' ? true : null
            ]
        );

        // 5. Cache successful verification in Redis (TTL: 10 minutes)
        if (decision === 'ALLOW' && redis.isAvailable()) {
            const cacheData = {
                session_id: payload.session_id,
                score: humanScore,
                decision,
                token: trustToken
            };
            await redis.set(`session:${payload.session_id}`, JSON.stringify(cacheData), {
                EX: 600 // 10 minutes
            });
        }

        return res.json({
            session_id: payload.session_id,
            score: humanScore,
            decision,
            token: trustToken,
            source: 'ML_ENGINE'
        });

    } catch (error) {
        console.error('Verification Error:', error.message);
        return res.status(500).json({
            error: 'Internal Server Error',
            details: error.message
        });
    }
});

module.exports = router;
