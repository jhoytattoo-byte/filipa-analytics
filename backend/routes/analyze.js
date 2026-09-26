// ============================================================
// ROUTES — ANALYZE v18.0 (com Rate Limit Supabase)
// ============================================================
const express = require('express');
const router = express.Router();
const { analyze } = require('../controllers/analyzeController');
const { rateLimitMiddleware } = require('../middleware/rateLimitMiddleware');

// Middleware: garante requestId em toda requisição
router.use((req, res, next) => {
    req.id = req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
});

// ✅ Rate Limit + Analyze
router.post('/', rateLimitMiddleware, analyze);

module.exports = router;