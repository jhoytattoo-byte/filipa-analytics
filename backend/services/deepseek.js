// ============================================================
// SERVIÇO DEEPSEEK — Curador / Fallback
// ============================================================

const axios = require('axios');
const logger = require('../utils/logger');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

async function complete(prompt, options = {}) {
    try {
        const model = options.model || DEEPSEEK_MODEL;
        const temperature = options.temperature ?? 0.3;
        const maxTokens = options.maxTokens || 2048;
        const jsonMode = options.jsonMode || false;

        logger.info(`[DeepSeekService] Modelo: ${model} | Enviando...`);

        // Se o prompt for array de mensagens, usa direto
        // Se for string, monta o array
        let messages;
        if (Array.isArray(prompt)) {
            messages = prompt;
        } else {
            messages = [
                { role: 'system', content: 'Voce e um analista de mercado financeiro. Responda de forma objetiva e tecnica.' },
                { role: 'user', content: String(prompt) }
            ];
        }

        const body = {
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens
        };

        if (jsonMode) {
            body.response_format = { type: 'json_object' };
        }

        const response = await axios.post(DEEPSEEK_URL, body, {
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const text = response.data.choices[0].message.content;
        logger.info('[DeepSeekService] Resposta recebida');
        return text;

    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        logger.error(`[DeepSeekService] Falhou [${status}]: ${msg}`);
        throw new Error(`DeepSeek error: ${msg}`);
    }
}

// Alias para compatibilidade
const chat = complete;

module.exports = { complete, chat };