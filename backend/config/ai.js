// ============================================================
// CONFIG — AI v17.7 (Corrigido: modelo vision atualizado)
// ============================================================
// CHANGELOG v17.7:
// - llama-3.2-11b-vision-preview → DESCONTINUADO pela Groq (404)
// - qwen/qwen3.6-27b → ÚNICO modelo vision disponível na Groq (31/07/2026)
// - Comentários corrigidos para refletir a realidade da API
// ============================================================

module.exports = {
  vision: {
    primary: 'groq',
    fallbacks: ['openai', 'gemini', 'claude'],
    models: {
      // ⚠️  MODELO DE VISÃO: DEVE suportar imagens!
      //     llama-3.2-11b-vision-preview = DESCONTINUADO pela Groq (retorna 404)
      //     qwen/qwen3.6-27b = ÚNICO modelo vision disponível na Groq (31/07/2026)
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
      groq_text: 'llama-3.1-70b-versatile'
    }
  },

  judge: {
    primary: 'claude',
    fallbacks: ['deepseek', 'groq_text'],
    models: {
      claude: 'claude-haiku-4-5-20251001',
      deepseek: 'deepseek-v4-flash',
      groq_text: 'llama-3.1-70b-versatile'
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