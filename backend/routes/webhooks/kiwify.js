// ============================================================
// kiwify.js — FILIPA v18.0 (PRODUÇÃO)
// Endpoint: POST /api/webhooks/kiwify
// ============================================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../../utils/logger');

// 🔐 Validação de assinatura (opcional mas recomendado)
function verifyKiwifySignature(req, secret) {
  if (!secret) return true; // Se não configurado, aceita tudo (desenvolvimento)
  
  const signature = req.headers['x-kiwify-signature'];
  if (!signature) return false;
  
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === expected;
}

// Mapeamento de produtos Kiwify → planos FILIPA
const PLAN_MAP = {
  'filipa-starter': { plan: 'STARTER', limit: 10 },
  'filipa-pro': { plan: 'PRO', limit: 25 },
  'filipa-elite': { plan: 'ELITE', limit: 60 },
  'filipa-master': { plan: 'MASTER', limit: 150 },
  'starter': { plan: 'STARTER', limit: 10 },
  'pro': { plan: 'PRO', limit: 25 },
  'elite': { plan: 'ELITE', limit: 60 },
  'master': { plan: 'MASTER', limit: 150 }
};

// Cache de eventos processados (idempotência em memória)
const processedEvents = new Set();

// POST /api/webhooks/kiwify
router.post('/kiwify', async (req, res) => {
  try {
    const payload = req.body;
    const orderId = payload.order_id || payload.id;
    const eventType = payload.order_status || payload.event_type;
    
    logger.info('[Kiwify] Evento recebido', { orderId, eventType });

    // 🔐 Validação de assinatura (se configurada)
    const isValid = verifyKiwifySignature(req, process.env.KIWIFY_WEBHOOK_SECRET);
    if (!isValid) {
      logger.warn('[Kiwify] Assinatura inválida!', { orderId });
      return res.status(401).json({ error: 'invalid_signature' });
    }

    // 🔄 Idempotência: ignora eventos já processados
    if (processedEvents.has(orderId)) {
      logger.info('[Kiwify] Evento duplicado ignorado', { orderId });
      return res.status(200).json({ received: true, duplicate: true });
    }

    // ✅ Processa apenas compras aprovadas
    if (eventType !== 'paid' && eventType !== 'approved') {
      logger.info('[Kiwify] Evento ignorado (não aprovado)', { eventType });
      return res.status(200).json({ received: true, processed: false });
    }

    // Extrai dados do cliente
    const customer = payload.Customer || payload.customer || {};
    const product = payload.Product || payload.product || {};
    const email = customer.email?.toLowerCase();

    if (!email) {
      logger.error('[Kiwify] Email não encontrado no payload', { payload });
      return res.status(400).json({ error: 'missing_email' });
    }

    // Identifica o plano
    const productName = (product.product_name || '').toLowerCase();
    const productId = product.product_id || product.id || '';
    
    let planoConfig = { plan: 'FREE', limit: 1 };
    for (const [key, config] of Object.entries(PLAN_MAP)) {
      if (productName.includes(key) || productId.includes(key)) {
        planoConfig = config;
        break;
      }
    }

    logger.info('[Kiwify] Ativando plano', { 
      email, 
      plan: planoConfig.plan,
      limit: planoConfig.limit 
    });

    // 💾 Atualiza no banco de dados
    // TODO: Substitua pela sua lógica real de banco (Supabase/Postgres/MySQL)
    const { createClient } = require('@supabase/supabase-js');
    
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: existingUser, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = não encontrado (ok, vamos criar)
        logger.error('[Kiwify] Erro ao buscar usuário', { error: fetchError.message });
      }

      const userData = {
        email,
        plan: planoConfig.plan,
        plan_status: 'active',
        analyses_limit: planoConfig.limit,
        plan_started_at: new Date().toISOString(),
        plan_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // +30 dias
        kiwify_order_id: orderId,
        updated_at: new Date().toISOString()
      };

      if (existingUser) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(userData)
          .eq('id', existingUser.id);
        
        if (updateErr) {
          logger.error('[Kiwify] Erro ao atualizar', { error: updateErr.message });
          return res.status(500).json({ error: 'update_failed' });
        }
      } else {
        const { error: insertErr } = await supabase
          .from('profiles')
          .insert(userData);
        
        if (insertErr) {
          logger.error('[Kiwify] Erro ao criar', { error: insertErr.message });
          return res.status(500).json({ error: 'insert_failed' });
        }
      }
    } else {
      logger.warn('[Kiwify] Supabase não configurado, pulando atualização', { email });
    }

    // Marca como processado
    processedEvents.add(orderId);
    
    // Limpa cache antigo (mantém apenas últimos 1000)
    if (processedEvents.size > 1000) {
      const firstKey = processedEvents.values().next().value;
      processedEvents.delete(firstKey);
    }

    logger.info('[Kiwify] ✅ Plano ativado com sucesso', { 
      email, 
      plan: planoConfig.plan 
    });

    return res.status(200).json({ 
      received: true, 
      processed: true, 
      plan: planoConfig.plan,
      email 
    });

  } catch (err) {
    logger.error('[Kiwify] Erro crítico', { error: err.message, stack: err.stack });
    return res.status(200).json({ 
      received: true, 
      processed: false, 
      error: err.message 
    });
  }
});

module.exports = router;