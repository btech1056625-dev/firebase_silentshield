const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const redis = require('../redis');

const JWT_SECRET = process.env.JWT_SECRET;

// Endpoint: Fallback Success Validation
router.post('/fallback-success', async (req, res) => {
    const { session_id } = req.body;

    try {
        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }

        await db.execute(
            `UPDATE verification_logs 
             SET fallback_passed = true, decision = 'ALLOW'
             WHERE session_id = ?`,
            [session_id]
        );

        const trustToken = jwt.sign(
            { session_id, status: 'HUMAN_FALLBACK_VERIFIED' },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Cache the successful fallback verification
        if (redis.isAvailable()) {
            const cacheData = {
                session_id,
                score: 1.0, 
                decision: 'ALLOW',
                token: trustToken
            };
            await redis.set(`session:${session_id}`, JSON.stringify(cacheData), {
                EX: 600 // 10 minutes
            });
        }

        return res.json({
            success: true,
            message: 'Fallback passed successfully.',
            token: trustToken,
            source: 'FALLBACK_VERIFIED'
        });

    } catch (error) {
        console.error('Fallback Error:', error.message);
        return res.status(500).json({
            error: 'Database update failed',
            details: error.message
        });
    }
});

module.exports = router;
