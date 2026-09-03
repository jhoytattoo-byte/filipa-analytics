// ============================================================
// CONFIG — ENV (v18.2) - ESTRATÉGIA DE CUSTO + DADOS REAIS
// ============================================================
// ESTRATÉGIA:
// 1º: Groq (GRÁTIS) → 2º: Gemini (GRÁTIS) → 3º: Qwen (PAGO)
// ============================================================

require('dotenv').config();

const config = {
    port: parseInt(process.env.PORT) || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // ============================================================
    // 🟢 PRIORIDADE 1: GROQ (GRÁTIS)
    // ============================================================
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        visionModel: process.env.GROQ_VISION_MODEL || 'qwen/qwen3.6-27b',
        textModel: process.env.GROQ_TEXT_MODEL || 'llama-3.1-70b-versatile',
        maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 4096,
        temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0
    },

    // ============================================================
    // 🟢 PRIORIDADE 2: GEMINI (GRÁTIS)
    // ============================================================
    gemini: {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-3.7-flash',
        maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 2048,
        temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.1
    },

    // ============================================================
    // 🔴 PRIORIDADE 3: QWEN (PAGO) - ÚLTIMO RECURSO
    // ============================================================
    qwen: {
        apiKey: process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY,
        visionModel: process.env.QWEN_VISION_MODEL || 'qwen3-vl-flash',
        textModel: process.env.QWEN_TEXT_MODEL || 'qwen3.5-72b',
        baseURL: process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        maxTokens: parseInt(process.env.QWEN_MAX_TOKENS) || 2048,
        temperature: parseFloat(process.env.QWEN_TEMPERATURE) || 0.1,
        enableThinking: process.env.QWEN_ENABLE_THINKING === 'true' || false,
        cacheEnabled: process.env.QWEN_CACHE_ENABLED !== 'false',
        cacheTTL: parseInt(process.env.QWEN_CACHE_TTL) || 3600,
        rpm: 1000,
        tpm: 1000000
    },

    // ============================================================
    // 📊 DADOS DE MERCADO (TwelveData + Polygon + Binance)
    // ============================================================
    twelvedata: {
        apiKey: process.env.TWELVEDATA_API_KEY,
        baseUrl: 'https://api.twelvedata.com'
    },
    polygon: {
        apiKey: process.env.POLYGON_API_KEY,
        baseUrl: 'https://api.polygon.io'
    },
    binance: {
        baseUrl: 'https://api.binance.com'
    }
};

// Validação do modelo Groq
if (config.groq.visionModel === 'llama-3.2-11b-vision-preview') {
    console.warn('⚠️  AVISO: GROQ_VISION_MODEL descontinuado! Usando qwen/qwen3.6-27b');
    config.groq.visionModel = 'qwen/qwen3.6-27b';
}

// Log da estratégia
console.log('📊 ESTRATÉGIA DE VISÃO:');
console.log('  🟢 1º: Groq (GRÁTIS)');
console.log('  🟢 2º: Gemini (GRÁTIS)');
console.log('  🔴 3º: Qwen (PAGO) - Último recurso');

module.exports = config;