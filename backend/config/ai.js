// ============================================================
// CONFIG — AI v18.0 (CORRIGIDO: Modelos atualizados)
// ============================================================
// CHANGELOG v18.0:
// - llama-3.1-70b-versatile → DESCONTINUADO pela Groq
// - llama-3.3-70b-versatile → Modelo atualizado para texto
// ============================================================

module.exports = {
  vision: {
    primary: 'groq',
    fallbacks: ['openai', 'gemini', 'claude'],
    models: {
      // ⚠️  MODELO DE VISÃO: DEVE suportar imagens!
      //     qwen/qwen3.6-27b = ÚNICO modelo vision disponível na Groq
      groq: 'qwen/qwen3.6-27b',
      openai: 'gpt-4o-mini',
      gemini: 'gemini-2.0-flash-exp',
      claude: 'claude-3-5-sonnet-20241022'
    }
  },

  curator: {
    primary: 'deepseek',
    fallbacks: ['groq_text'],
    models: {
      deepseek: 'deepseek-v4-flash',
      groq_text: 'llama-3.3-70b-versatile'  // ✅ ATUALIZADO!
    }
  },

  judge: {
    primary: 'claude',
    fallbacks: ['deepseek', 'groq_text'],
    models: {
      claude: 'claude-haiku-4-5-20251001',
      deepseek: 'deepseek-v4-flash',
      groq_text: 'llama-3.3-70b-versatile'  // ✅ ATUALIZADO!
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