// ============================================================
// ROUTES — ANALYZE v4.0 (Rate Limit Supabase + Admin Ilimitado)
// ============================================================
const express = require('express');
const router = express.Router();
const { analyze } = require('../controllers/analyzeController');
const { rateLimitMiddleware } = require('../middleware/rateLimitMiddleware');

// ✅ Aplica o rate limit persistente (Supabase) antes de processar
router.post('/', rateLimitMiddleware, analyze);

module.exports = router;