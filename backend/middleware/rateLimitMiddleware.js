// ============================================================
// rateLimitMiddleware.js — FILIPA v5.0 (Admin Ilimitado + Fixes)
// ============================================================
// Correções v5.0:
//   [FIX 1] Fuso horário BRT no getCurrentDay()
//   [FIX 2] Plan normalizado para UPPERCASE
//   [FIX 3] Admin reconhecido por header x-user-email mesmo sem token
//   [FIX 4] upsert com onConflict (evita race condition)
//   [FIX 5] Logs de diagnóstico no topo do middleware
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
// ADMINS — SEM LIMITE
// ============================================================
const ADMIN_EMAILS_FIXO = [
  'contato.multsystem@gmail.com'
];

const ADMIN_EMAILS_ENV = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(e => e);

const ADMIN_EMAILS = [
  ...ADMIN_EMAILS_FIXO.map(e => e.toLowerCase()),
  ...ADMIN_EMAILS_ENV
];

// ============================================================
// HELPERS
// ============================================================

// [FIX 1] Fuso horário forçado para Brasília (UTC-3)
function getCurrentMonth() {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000); // BRT
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getCurrentDay() {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000); // BRT
  return d.toISOString().split('T')[0];
}

function isAdmin(email) {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// [FIX 2] Normaliza plano para UPPERCASE
function normalizePlan(plan) {
  if (!plan || typeof plan !== 'string') return 'FREE';
  const p = plan.trim().toUpperCase();
  return PLAN_LIMITS[p] ? p : 'FREE';
}

// ============================================================
// CHECK RATE LIMIT (Supabase)
// ============================================================
async function checkRateLimit(supabase, userId, userEmail, plan = 'FREE') {
  const planKey = normalizePlan(plan);           // [FIX 2]
  const limits = PLAN_LIMITS[planKey];
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
    return { allowed: true, remaining: limits.monthly, plan: planKey, failOpen: true };
  }

  const now = Date.now();

  // Primeira requisição do mês
  // [FIX 4] upsert com onConflict (evita race condition)
  if (!row) {
    await supabase.from('rate_limits').upsert(
      {
        user_id: userId,
        email: userEmail,
        plan: planKey,
        month,
        count: 1,
        daily_count: 1,
        last_request: now,
        last_day: day
      },
      { onConflict: 'user_id,month' }
    );
    return { allowed: true, remaining: limits.monthly - 1, plan: planKey };
  }

  // Verifica delay entre análises
  const timeSinceLast = now - (row.last_request || 0);
  if (timeSinceLast < limits.delay) {
    const waitSec = Math.ceil((limits.delay - timeSinceLast) / 1000);
    return {
      allowed: false,
      reason: 'FLOOD',
      waitSeconds: waitSec,
      message: `Aguarde ${waitSec}s entre análises (plano ${planKey})`
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
      last_day: day,
      plan: planKey         // atualiza plano caso tenha mudado
    })
    .eq('user_id', userId)
    .eq('month', month);

  return {
    allowed: true,
    remaining: limits.monthly - row.count - 1,
    dailyRemaining: limits.daily - dailyCount - 1,
    plan: planKey
  };
}

// ============================================================
// MIDDLEWARE PRINCIPAL
// ============================================================
async function rateLimitMiddleware(req, res, next) {
  try {
    // [FIX 5] Log de diagnóstico
    const headerEmail = (req.headers['x-user-email'] || '').trim();
    const hasAuth = !!req.headers['authorization'];

    console.log('[RateLimit] 🚦 Executando', {
      ip: req.ip,
      path: req.path,
      hasAuth,
      headerEmail: headerEmail || '(vazio)'
    });

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
      } else if (error) {
        console.warn('[RateLimit] Token inválido:', error.message);
      }
    }

    // [FIX 3] Admin reconhecido por header OU token, mesmo sem token válido
    if (isAdmin(userEmail) || isAdmin(headerEmail)) {
      const adminEmail = userEmail || headerEmail;
      console.log(`[RateLimit] 🔓 Admin liberado: ${adminEmail}`);
      req.rateLimit = { allowed: true, remaining: Infinity, plan: 'ADMIN' };
      req.user = { id: userId, email: adminEmail, plan: 'ADMIN' };
      return next();
    }

    // Fallback: headers (usuário anônimo ou sem token)
    if (userId === 'anonymous') {
      userId = req.headers['x-user-id'] || 'anonymous';
      userEmail = headerEmail || '';
      plan = req.headers['x-user-plan'] || 'FREE';
    }

    // Normaliza plano antes de checar
    plan = normalizePlan(plan); // [FIX 2]

    // 🔥 USUÁRIO NORMAL — APLICA O LIMITE
    const result = await checkRateLimit(supabase, userId, userEmail, plan);

    if (!result.allowed) {
      console.log(`[RateLimit] ⛔ Bloqueado: ${userEmail || userId} — ${result.reason}`);
      return res.status(429).json({
        success: false,
        error: result.reason,
        message: result.message,
        waitSeconds: result.waitSeconds || null,
        upgrade: result.upgrade || false
      });
    }

    req.rateLimit = result;
    req.user = { id: userId, email: userEmail, plan: result.plan };
    next();

  } catch (err) {
    console.error('[RateLimit] Erro inesperado:', err.message, err.stack);
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
  isAdmin,
  normalizePlan
};