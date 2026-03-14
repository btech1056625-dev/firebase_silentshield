const express = require('express');
const router = express.Router();
const db = require('../db');

// Health route
router.get('/health', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT 1 AS ok');
        res.json({
            success: true,
            message: 'Risk engine running',
            db: rows[0].ok === 1 ? 'connected' : 'not connected'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

module.exports = router;
