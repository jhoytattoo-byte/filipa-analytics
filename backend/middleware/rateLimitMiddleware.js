// ============================================================
// rateLimitMiddleware.js — FILIPA v4.0 (Admin Ilimitado)
// ============================================================
// Admin (contato.multsystem@gmail.com): SEM LIMITES
// Usuários normais: limites por plano (FREE, STARTER, PRO, ELITE, MASTER)
// ============================================================

// ============================================================
// PLANOS E LIMITES
// ============================================================
const PLAN_LIMITS = {
  FREE:    { monthly: 30,   daily: 1,   delay: 300000 },  // 5min
  STARTER: { monthly: 300,  daily: 10,  delay: 60000 },   // 1min
  PRO:     { monthly: 750,  daily: 25,  delay: 30000 },   // 30s
  ELITE:   { monthly: 1800, daily: 60,  delay: 15000 },   // 15s
  MASTER:  { monthly: 4500, daily: 150, delay: 5000 }     // 5s
};

// ============================================================
// ADMINS — SEM LIMITE (FIXO)
// ============================================================
const ADMIN_EMAILS_FIXO = [
  'contato.multsystem@gmail.com'
];

const ADMIN_EMAILS_ENV = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(e => e);

const ADMIN_EMAILS = [...ADMIN_EMAILS_FIXO, ...ADMIN_EMAILS_ENV];

// ============================================================
// HELPERS
// ============================================================
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getCurrentDay() {
  return new Date().toISOString().split('T')[0];
}

function isAdmin(email) {
  if (!email) return false;
  return ADMIN_EMAILS.some(admin => admin.toLowerCase() === email.toLowerCase());
}

// ============================================================
// CHECK RATE LIMIT (Supabase)
// ============================================================
async function checkRateLimit(supabase, userId, userEmail, plan = 'FREE') {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  const month = getCurrentMonth();
  const day = getCurrentDay();

  // Busca o registro do usuário
  const { data: row, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  if (error) {
    console.error('[RateLimit] Erro ao buscar:', error.message);
    return { allowed: true, remaining: limits.monthly, plan, failOpen: true };
  }

  const now = Date.now();

  // Primeira requisição do mês
  if (!row) {
    await supabase.from('rate_limits').insert({
      user_id: userId,
      email: userEmail,
      plan,
      month,
      count: 1,
      daily_count: 1,
      last_request: now,
      last_day: day
    });
    return { allowed: true, remaining: limits.monthly - 1, plan };
  }

  // Verifica delay entre análises
  const timeSinceLast = now - (row.last_request || 0);
  if (timeSinceLast < limits.delay) {
    const waitSec = Math.ceil((limits.delay - timeSinceLast) / 1000);
    return {
      allowed: false,
      reason: 'FLOOD',
      waitSeconds: waitSec,
      message: `Aguarde ${waitSec}s entre análises (plano ${plan})`
    };
  }

  // Verifica cota mensal
  if (row.count >= limits.monthly) {
    return {
      allowed: false,
      reason: 'QUOTA',
      message: `Cota mensal esgotada (${limits.monthly} análises). Faça upgrade.`,
      upgrade: true
    };
  }

  // Verifica cota diária
  const isNewDay = row.last_day !== day;
  const dailyCount = isNewDay ? 0 : (row.daily_count || 0);
  
  if (dailyCount >= limits.daily) {
    return {
      allowed: false,
      reason: 'DAILY_QUOTA',
      message: `Cota diária esgotada (${limits.daily} análises/dia). Volte amanhã ou faça upgrade.`,
      upgrade: true
    };
  }

  // Atualiza o registro
  await supabase
    .from('rate_limits')
    .update({
      count: row.count + 1,
      daily_count: dailyCount + 1,
      last_request: now,
      last_day: day
    })
    .eq('user_id', userId)
    .eq('month', month);

  return {
    allowed: true,
    remaining: limits.monthly - row.count - 1,
    dailyRemaining: limits.daily - dailyCount - 1,
    plan
  };
}

// ============================================================
// MIDDLEWARE PRINCIPAL
// ============================================================
async function rateLimitMiddleware(req, res, next) {
  try {
    // Pega o token do header Authorization
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();

    const supabase = req.app.get('supabase') || require('../services/supabaseClient');
    let userId = 'anonymous';
    let userEmail = '';
    let plan = 'FREE';

    // Valida o token via Supabase Auth
    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
        userEmail = user.email || '';
        plan = user.user_metadata?.plano || 'FREE';
      }
    }

    // Fallback: headers
    if (userId === 'anonymous') {
      userId = req.headers['x-user-id'] || 'anonymous';
      userEmail = req.headers['x-user-email'] || '';
      plan = req.headers['x-user-plan'] || 'FREE';
    }

    // 🔥 ADMIN — ILIMITADO
    if (isAdmin(userEmail)) {
      console.log(`[RateLimit] 🔓 Admin liberado: ${userEmail}`);
      req.rateLimit = { allowed: true, remaining: Infinity, plan: 'ADMIN' };
      req.user = { id: userId, email: userEmail, plan: 'ADMIN' };
      return next();
    }

    // 🔥 USUÁRIO NORMAL — APLICA O LIMITE
    const result = await checkRateLimit(supabase, userId, userEmail, plan);

    if (!result.allowed) {
      return res.status(429).json({
        success: false,
        error: result.reason,
        message: result.message,
        waitSeconds: result.waitSeconds || null,
        upgrade: result.upgrade || false
      });
    }

    req.rateLimit = result;
    req.user = { id: userId, email: userEmail, plan };
    next();

  } catch (err) {
    console.error('[RateLimit] Erro inesperado:', err.message);
    next(); // fail-open
  }
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  rateLimitMiddleware,
  checkRateLimit,
  PLAN_LIMITS,
  ADMIN_EMAILS,
  isAdmin
};