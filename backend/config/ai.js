// ============================================================
// CONFIG — AI v18.2 (CORRIGIDO FINALMENTE)
// ============================================================
// CHANGELOG v18.2:
// - qwen/qwen3.6-27b → DESCONTINUADO
// - qwen/qwen3.8-27b → ✅ MODELO ATUAL E DISPONÍVEL NA GROQ
// ============================================================

module.exports = {
  vision: {
    primary: 'groq',
    fallbacks: ['openai', 'gemini', 'claude'],
    models: {
      groq: 'qwen/qwen3.8-27b',
      openai: 'gpt-4o-mini',
      gemini: 'gemini-2.0-flash-exp',
      claude: 'claude-3-5-sonnet-20241022'
    }
  },

  curator: {
    primary: 'groq',
    fallbacks: [],
    models: {
      groq: 'qwen/qwen3.8-27b'
    }
  },

  judge: {
    primary: 'groq',
    fallbacks: [],
    models: {
      groq: 'qwen/qwen3.8-27b'
    }
  },

  defaults: {
    temperature: 0.1,
    maxTokens: 4096,
    timeout: 30000,
    retries: 3,
    retryDelay: 1000
  }
};