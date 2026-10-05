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
        
       const promptVision = `Você é um extrator de dados de gráficos financeiros. Sua ÚNICA função é retornar JSON válido.

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON, sem texto antes ou depois
2. Sem explicações, sem comentários, sem markdown
3. Se não conseguir extrair algum campo, use valor padrão
4. Para os CANDLES, extraia TODOS os candles visíveis no gráfico (mínimo 20)

⚠️ ATENÇÃO AO PREÇO (CRÍTICO):
- Ações (AAPL, TSLA, NVDA): ponto decimal → 334.12 (NÃO 334120)
- Forex (EUR/USD, GBP/USD): ponto decimal → 1.12345 (NÃO 112345)
- Crypto (BTC, ETH): ponto decimal → 85000.50 (NÃO 8500050)
- B3 WIN/WDO: inteiro em PONTOS → 175000 (correto)
- B3 ações (PETR4, VALE3): ponto decimal → 38.45
- Índices (S&P, IBOV): inteiro com separador → 5800.50
- NUNCA remova o ponto decimal. Use o formato que aparece no gráfico.

Extraia do gráfico:
- Ativo (ex: WINV26, WDOV26, PETR4, VALE3)
- Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d)
- Tendência visual (ALTA, BAIXA, LATERAL)
- Preço atual (número puro)
- RSI estimado (0-100)
- Padrão de candle predominante
- Confiança da análise (0-100)
- CANDLES: array com TODOS os candles visíveis (open, close, high, low, cor)

JSON OBRIGATÓRIO:
{
  "ativo": "WINV26",
  "timeframe": "15m",
  "tendencia": "ALTA",
  "preco_atual": 175000,
  "rsi": 55,
  "padrao_candle": "martelo",
  "confianca": 85,
  "candles": [
    { "open": 174800, "close": 175100, "high": 175200, "low": 174700, "cor": "verde" },
    ... (mínimo 20 candles)
  ]
}

Responda APENAS o JSON. NADA MAIS.`;

const response = await groq.chat.completions.create({
    model: modelName,
    messages: [
        { role: 'user', content: [
            { type: 'text', text: promptVision },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,' + image } }
        ]}
    ],
    temperature: config.groq.temperature || 0,
    max_tokens: 1000,  // limite Groq Free
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