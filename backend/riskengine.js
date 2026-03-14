require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import modular routes
const healthRoutes = require('./routes/health');
const verifyRoutes = require('./routes/verify');
const fallbackRoutes = require('./routes/fallback');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Mount routes
app.use('/api', healthRoutes);
app.use('/api', verifyRoutes);
app.use('/api', fallbackRoutes);

app.listen(PORT, () => {
    console.log(`✅ Node Risk Engine running on port ${PORT}`);
});