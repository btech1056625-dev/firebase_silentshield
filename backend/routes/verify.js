const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const db = require('../db');
const redis = require('../redis');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000/predict';

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

        // 2. Prepare feature payload for Python ML service
        // Mapping frontend features -> ML model features
        const mlPayload = {
            'mouse_avg_velocity': payload.behavior.avgMouseSpeed || 0,
            'mouse_acceleration_std': Math.sqrt(payload.behavior.mouseJerkiness || 0), // Jerkiness is variance, model likely wants std
            'mouse_curvature_entropy': 0.85, // Placeholder if not tracked
            'click_frequency': payload.behavior.clickCount / 5, // clickCount over 5s interval
            'typing_dwell_time': 0.12, // Placeholder
            'typing_flight_time': 0.15, // Placeholder
            'user_agent_entropy': 14.2, // Derived from agent in real setup
            'screen_resolution_variety': 2.0, 
            'webgl_fingerprint_uniqueness': 0.98,
            'font_count': 45,
            'requests_per_second': 5.5,
            'session_duration': 5,
            'navigation_entropy': 1.2,
            'burstiness': 0.4,
            'interaction_complexity': 38.42,
            'human_behavior_score': 0.27,
            'session_intensity': 0.0183
        };

        const mlResponse = await axios.post(ML_SERVICE_URL, mlPayload);
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
