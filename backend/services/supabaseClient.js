// ============================================================
// supabaseClient.js — Cliente Supabase para o Backend
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bmpvtxjmbizskyaqyfhe.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[SupabaseClient] ❌ SUPABASE_SERVICE_ROLE_KEY não configurada!');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

module.exports = supabase;