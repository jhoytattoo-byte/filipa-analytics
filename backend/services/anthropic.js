// ============================================================
// SERVIÇO ANTHROPIC (Claude) — Juiz Filipa
// Modelos ativos em agosto 2026
// ============================================================

const axios = require('axios');
const logger = require('../utils/logger');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Modelos ATIVOS em ordem de preferencia (Haiku -> Sonnet -> Opus)
const MODELS = [
    'claude-haiku-4-5-20251001',   // Haiku 4.5 — baixo custo, rapido
    'claude-sonnet-4-6',            // Sonnet 4.6 — balanceado
    'claude-opus-4-8'               // Opus 4.8 — maxima qualidade
];

async function complete(prompt, options = {}) {
    let lastError = null;

    for (const model of MODELS) {
        try {
            const maxTokens = options.maxTokens || 2048;
            const temperature = options.temperature ?? 0.3;

            logger.info(`[AnthropicService] Modelo: ${model} | Enviando...`);

            const response = await axios.post(
                ANTHROPIC_URL,
                {
                    model: model,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    system: 'Voce e a Filipa, uma juiza de trading experiente. Analise dados tecnicos e tome decisoes objetivas. Responda em JSON quando solicitado.',
                    messages: [
                        { role: 'user', content: String(prompt) }
                    ]
                },
                {
                    headers: {
                        'x-api-key': ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01',
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const text = response.data.content[0].text;
            logger.info(`[AnthropicService] Resposta recebida (modelo: ${model})`);
            return text;

        } catch (error) {
            const msg = error.response?.data?.error?.message || error.message;
            const status = error.response?.status;
            logger.warn(`[AnthropicService] Modelo ${model} falhou [${status}]: ${msg}`);
            lastError = msg;
        }
    }

    logger.error(`[AnthropicService] Todos os modelos falharam. Ultimo erro: ${lastError}`);
    throw new Error(`Anthropic error: ${lastError}`);
}

// Alias para compatibilidade
const message = complete;

module.exports = { complete, message };