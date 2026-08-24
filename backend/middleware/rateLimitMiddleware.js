// ============================================================
// rateLimitMiddleware.js — 🔥 MODO COMPETIÇÃO
// ============================================================
// SEM LIMITES! A FILIPA VAI VOAR!
// ============================================================

function rateLimitMiddleware(req, res, next) {
    console.log(`[RateLimit] 🏆 COMPETIÇÃO - ANÁLISE LIBERADA!`);
    req.rateLimit = { 
        allowed: true, 
        remaining: Infinity, 
        plan: 'COMPETICAO'
    };
    next();
}

module.exports = {
    rateLimitMiddleware,
    checkRateLimit: async () => ({ allowed: true, remaining: Infinity }),
    resetUserQuota: async () => ({ reset: true }),
    getUsageStats: async () => ({ used: 0, limit: Infinity, plan: 'COMPETICAO' }),
    PLAN_LIMITS: {},
    ADMIN_EMAILS: ['*'],
    isAdmin: () => true
};
