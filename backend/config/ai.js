// ============================================================
// CONFIG — AI v18.1 (CORRIGIDO FINALMENTE)
// ============================================================
// CHANGELOG v18.1:
// - llama-3.1-70b-versatile → DESCONTINUADO
// - llama-3.3-70b-versatile → DESCONTINUADO (16/08/2026)
// - qwen/qwen3.6-27b → ✅ MODELO ATUAL E DISPONÍVEL NA GROQ
// ============================================================

module.exports = {
  vision: {
    primary: 'groq',
    fallbacks: ['openai', 'gemini', 'claude'],
    models: {
      groq: 'qwen/qwen3.6-27b',
      openai: 'gpt-4o-mini',
      gemini: 'gemini-2.0-flash-exp',
      claude: 'claude-3-5-sonnet-20241022'
    }
  },

  curator: {
    primary: 'groq',
    fallbacks: [],
    models: {
      groq: 'qwen/qwen3.6-27b'  // ✅ ATUALIZADO
    }
  },

  judge: {
    primary: 'groq',
    fallbacks: [],
    models: {
      groq: 'qwen/qwen3.6-27b'  // ✅ ATUALIZADO
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