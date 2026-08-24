// ============================================================
// SERVICE — GROQ (COM FALLBACK ESTRATÉGICO)
// ============================================================
// ESTRATÉGIA DE CUSTO:
// 1º: Groq (GRÁTIS) → 2º: Gemini (GRÁTIS) → 3º: Qwen (PAGO)
// ============================================================

const { Groq } = require('groq-sdk');
const config = require('../config/env');
const prompts = require('../config/prompts');
const geminiService = require('./geminiVision');
const qwenService = require('./qwen');

const groq = new Groq({ apiKey: config.groq.apiKey });

async function vision(image, model) {
    // ============================================================
    // 🟢 PRIORIDADE 1: GROQ (GRÁTIS)
    // ============================================================
    const modelName = model || config.groq.visionModel || 'qwen/qwen3.6-27b';
    
    try {
        console.log(`[Vision] 🟢 PRIORIDADE 1: Groq Vision (GRÁTIS) com ${modelName}`);
        
        const response = await groq.chat.completions.create({
            model: modelName,
            messages: [
                {
                    role: 'system',
                    content: prompts.vision
                },
                {
                    role: 'user',
                    content: [
                        { 
                            type: 'text', 
                            text: 'Extraia os dados do gráfico e retorne APENAS JSON válido.' 
                        },
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: 'data:image/png;base64,' + image 
                            } 
                        }
                    ]
                }
            ],
            temperature: config.groq.temperature || 0,
            max_tokens: config.groq.maxTokens || 4096,
            response_format: { type: 'json_object' },
            reasoning_format: 'hidden'  // Evita erro 400
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
        const modelName = model || config.groq.textModel || 'llama-3.1-70b-versatile';
        
        const response = await groq.chat.completions.create({
            model: modelName,
            messages: [
                { 
                    role: 'system', 
                    content: 'Você é FILIPA, uma IA especialista em trading.' 
                },
                { 
                    role: 'user', 
                    content: prompt 
                }
            ],
            temperature: config.groq.temperature || 0,
            max_tokens: config.groq.maxTokens || 4096
        });
        
        console.log('[Vision] ✅ Groq Text OK (GRÁTIS!)');
        return response.choices[0].message.content;
        
    } catch (error) {
        console.error('[Vision] ❌ Groq Text falhou:', error.message);
    }

    // ============================================================
    // 🟢 PRIORIDADE 2: GEMINI TEXT (GRÁTIS)
    // ============================================================
    try {
        console.log('[Vision] 🟢 Gemini Text (GRÁTIS)');
        // Implementar se necessário
        throw new Error('Gemini text não implementado');
        
    } catch (error) {
        console.error('[Vision] ❌ Gemini Text falhou:', error.message);
    }

    // ============================================================
    // 🔴 PRIORIDADE 3: QWEN TEXT (PAGO)
    // ============================================================
    try {
        console.log('[Vision] 🔴 Qwen Text (PAGO) - Último recurso');
        const response = await qwenService.vision(prompt);
        return response;
        
    } catch (error) {
        console.error('[Vision] ❌ Qwen Text falhou:', error.message);
    }

    throw new Error('Todos os serviços de texto falharam');
}

module.exports = { vision, text };