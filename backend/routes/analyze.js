// ============================================================
// ROUTES — ANALYZE v3.0 (com Rate Limit)
// ============================================================

const express = require('express');
const router = express.Router();
const { analyze } = require('../controllers/analyzeController');

// Rate Limit wrapper — fail-safe: se der erro, passa direto
async function rateLimitWrapper(req, res, next) {
  try {
    const { checkRateLimit } = require('../middleware/rateLimitMiddleware');
    const userId = req.user?.id || req.headers['x-user-id'] || 'anonymous';
    const plan = req.user?.plan || 'FREE';

    const result = await checkRateLimit(userId, plan);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: result.reason,
        message: result.message,
        waitSeconds: result.waitSeconds || null,
        upgrade: result.upgrade || false,
        quota: { used: result.used, remaining: result.remaining, plan }
      });
    }

    // Anexa info de cota para o controller usar na resposta
    req.rateLimit = result;
    next();

  } catch (err) {
    // Falha silenciosa: rate limit não existe ou SQLite falhou
    console.log('[RateLimit] Bypass:', err.message);
    next();
  }
}

router.post('/', rateLimitWrapper, analyze);

module.exports = router;