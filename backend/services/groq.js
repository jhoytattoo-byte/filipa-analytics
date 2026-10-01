// ============================================================
// SERVICE — GROQ (COM FALLBACK ESTRATÉGICO) - CORRIGIDO v18.4
// ============================================================
// ESTRATÉGIA DE CUSTO:
// 1º: Groq (GRÁTIS) → 2º: Gemini (GRÁTIS) → 3º: Qwen (PAGO)
// ============================================================

const { Groq } = require('groq-sdk');
const config = require('../config/env');
const prompts = require('../config/prompts');
const geminiService = require('./geminiVision');
const qwenService = require('./qwen');
const deepseekService = require('./deepseek');      // 🔥 NOVO
const anthropicService = require('./anthropic');    // 🔥 NOVO

const groq = new Groq({ apiKey: config.groq.apiKey });

async function vision(image, model) {
    // ============================================================
    // 🟢 PRIORIDADE 1: GROQ VISION (GRÁTIS)
    // ============================================================
    // ATENÇÃO: Para visão, usamos o MODELO DE VISÃO (qwen3-vl-flash),
    // NÃO o modelo de texto (qwen/qwen3.8-27b)!
    const modelName = model || config.groq.visionModel || 'qwen3-vl-flash';
    
    try {
        console.log(`[Vision] 🟢 PRIORIDADE 1: Groq Vision (GRÁTIS) com ${modelName}`);
        
        const response = await groq.chat.completions.create({
            model: modelName,
            messages: [
                { role: 'system', content: prompts.vision },
                { role: 'user', content: [
                    { type: 'text', text: 'Extraia os dados do gráfico e retorne APENAS JSON válido.' },
                    { type: 'image_url', image_url: { url: 'data:image/png;base64,' + image } }
                ]}
            ],
            temperature: config.groq.temperature || 0,
            max_tokens: 800,
            response_format: { type: 'json_object' },
            reasoning_format: 'hidden'
        });
        
        console.log('[Vision] ✅ Groq OK (GRÁTIS!)');
        return response.choices[0].message.content;
        
    } catch (error) {
        console.error('[Vision] ❌ Groq falhou:', error.message);
    }

    // ============================================================
    // 🟢 PRIORIDADE 2: GEMINI (GRÁTIS)
    // ============================================================
    try {
        console.log('[Vision] 🟢 PRIORIDADE 2: Gemini Vision (GRÁTIS)');
        const geminiResponse = await geminiService.analyzeChart(image);
        console.log('[Vision] ✅ Gemini OK (GRÁTIS!)');
        return geminiResponse;
        
    } catch (geminiError) {
        console.error('[Vision] ❌ Gemini falhou:', geminiError.message);
    }

    // ============================================================
    // 🔴 PRIORIDADE 3: QWEN (PAGO) - ÚLTIMO RECURSO
    // ============================================================
    try {
        console.log('[Vision] 🔴 PRIORIDADE 3: Qwen Vision (PAGO) - Último recurso');
        const qwenResponse = await qwenService.vision(image);
        console.log('[Vision] ✅ Qwen OK (PAGO)');
        return qwenResponse;
        
    } catch (qwenError) {
        console.error('[Vision] ❌ Qwen falhou:', qwenError.message);
    }

    // ============================================================
    // 💀 TODOS FALHARAM
    // ============================================================
    throw new Error('Todos os serviços de visão falharam (Groq, Gemini, Qwen)');
}

async function text(prompt, model) {
    // ============================================================
    // 🟢 PRIORIDADE 1: GROQ TEXT (GRÁTIS)
    // ============================================================
    try {
        const modelName = model || config.groq.textModel || 'llama-3.3-70b-versatile';
        
        const response = await groq.chat.completions.create({
            model: modelName,
            messages: [
                { role: 'system', content: 'Você é FILIPA, uma IA especialista em trading.' },
                { role: 'user', content: prompt }
            ],
            temperature: config.groq.temperature || 0,
            max_tokens: 800,
        });
        
        console.log('[Text] ✅ Groq Text OK (GRÁTIS!)');
        return response.choices[0].message.content;
        
    } catch (error) {
        console.error('[Text] ❌ Groq Text falhou:', error.message);
    }

    // ============================================================
    // 🟡 PRIORIDADE 2: DEEPSEEK (PAGO — fallback do Curador)
    // ============================================================
    try {
        console.log('[Text] 🟡 DeepSeek (PAGO — fallback do Curador)');
        const resposta = await deepseekService.complete(prompt, {
            maxTokens: 800,
            temperature: 0.3
        });
        console.log('[Text] ✅ DeepSeek OK (PAGO)');
        return resposta;
    } catch (error) {
        console.error('[Text] ❌ DeepSeek falhou:', error.message);
    }

    // ============================================================
    // 🔴 PRIORIDADE 3: ANTHROPIC CLAUDE (PAGO — último recurso)
    // ============================================================
    try {
        console.log('[Text] 🔴 Anthropic Claude (PAGO — último recurso)');
        const resposta = await anthropicService.complete(prompt, {
            maxTokens: 800,
            temperature: 0.3
        });
        console.log('[Text] ✅ Anthropic OK (PAGO)');
        return resposta;
    } catch (error) {
        console.error('[Text] ❌ Anthropic falhou:', error.message);
    }

    // ============================================================
    // 💀 TODOS FALHARAM
    // ============================================================
    throw new Error('Todos os serviços de texto falharam (Groq, DeepSeek, Anthropic)');
}

module.exports = { vision, text };