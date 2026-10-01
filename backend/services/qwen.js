// ============================================================
// SERVICE — QWEN3-VL-FLASH (DashScope)
// ============================================================
const OpenAI = require('openai');
const config = require('../config/env');

// Inicializa o cliente OpenAI compatível com DashScope
const client = new OpenAI({
    apiKey: config.qwen?.apiKey || process.env.DASHSCOPE_API_KEY,
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
});

async function vision(image, model = 'qwen3-vl-flash') {
    const apiKey = config.qwen?.apiKey || process.env.DASHSCOPE_API_KEY;
    
    if (!apiKey) {
        console.error('[Qwen] ❌ DASHSCOPE_API_KEY não configurada!');
        throw new Error('DASHSCOPE_API_KEY não encontrada');
    }

    try {
        console.log(`[Qwen] 🚀 Analisando imagem com ${model}...`);

        // Determina se a imagem é URL ou base64
        let imageUrl = image;
        if (!image.startsWith('http://') && !image.startsWith('https://')) {
            // Se for base64, adiciona o prefixo
            if (!image.startsWith('data:image')) {
                imageUrl = `data:image/png;base64,${image}`;
            } else {
                imageUrl = image;
            }
        }

        const completion = await client.chat.completions.create({
            model: model,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: imageUrl
                            }
                        },
                        {
    type: 'text',
    text: `Você é um extrator de dados de gráficos financeiros. Sua ÚNICA função é retornar JSON válido.

REGRAS CRÍTICAS:
1. Retorne APENAS o JSON, sem texto antes ou depois
2. Sem explicações, sem comentários, sem markdown
3. Se não conseguir extrair algum campo, use valor padrão
4. Para os CANDLES, extraia TODOS os candles visíveis no gráfico (mínimo 20)

Extraia do gráfico:
- Ativo (ex: WINV26, WDOV26, PETR4, VALE3)
- Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d)
- Tendência visual (ALTA, BAIXA, LATERAL)
- Preço atual (número puro, ex: 175000 para WIN, 5200 para WDO)
- RSI estimado (0-100)
- Padrão de candle predominante
- Confiança da análise (0-100)
- CANDLES: array com TODOS os candles visíveis da esquerda para a direita, cada um com:
    * open: preço de abertura (número)
    * close: preço de fechamento (número)
    * high: preço máximo (número)
    * low: preço mínimo (número)
    * cor: "verde" se close > open, "vermelha" se close < open

IMPORTANTE SOBRE CANDLES:
- Extraia TODOS os candles visíveis no gráfico (mínimo 20, ideal 30-50)
- Mantenha a ORDEM CRONOLÓGICA (mais antigo primeiro, mais recente por último)
- Leia os preços do eixo Y do gráfico
- Se não conseguir ler com precisão, estime pelo tamanho visual
- NUNCA retorne array vazio — sempre tente extrair pelo menos 20 candles

JSON OBRIGATÓRIO (preencha TODOS os campos):
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
    { "open": 175100, "close": 174900, "high": 175150, "low": 174850, "cor": "vermelha" },
    { "open": 174900, "close": 175200, "high": 175300, "low": 174880, "cor": "verde" }
  ]
}

(Nota: o exemplo acima mostra só 3 candles, mas você deve extrair TODOS os candles visíveis. Quanto mais, melhor.)

IMPORTANTE: Responda APENAS o JSON acima preenchido. NADA MAIS.`
}
                    ]
                }
            ],
            stream: false,
            // Desativa thinking para respostas mais rápidas
            extra_body: {
                enable_thinking: false
            }
        });

        console.log('[Qwen] ✅ Análise concluída!');

        const content = completion.choices[0]?.message?.content || '';
        
        if (!content) {
            console.error('[Qwen] ❌ Resposta vazia');
            throw new Error('Resposta vazia da Qwen');
        }

        // Tenta parsear JSON
        try {
            const parsed = JSON.parse(content);
            
            // 🔥 Log de diagnóstico: quantos candles vieram?
            if (parsed.candles && Array.isArray(parsed.candles)) {
                console.log(`[Qwen] 📊 Candles extraídos: ${parsed.candles.length}`);
            } else {
                console.warn('[Qwen] ⚠️ Modelo NÃO retornou campo "candles"');
            }
            
            return JSON.stringify(parsed);
        } catch (e) {
            console.warn('[Qwen] ⚠️ Resposta não é JSON, tentando extrair...');
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return jsonMatch[0];
            }
            throw new Error('JSON não encontrado na resposta');
        }

    } catch (error) {
        console.error('[Qwen] ❌ Falhou:', error.message);
        
        if (error.response) {
            console.error('[Qwen] Status:', error.response.status);
            console.error('[Qwen] Dados:', JSON.stringify(error.response.data, null, 2));
        }
        
        throw error;
    }
}

// Versão com streaming (para análises longas)
async function visionStream(image, model = 'qwen3-vl-flash') {
    const apiKey = config.qwen?.apiKey || process.env.DASHSCOPE_API_KEY;
    
    if (!apiKey) {
        throw new Error('DASHSCOPE_API_KEY não encontrada');
    }

    console.log(`[Qwen] 🚀 Analisando imagem com streaming...`);

    let imageUrl = image;
    if (!image.startsWith('http://') && !image.startsWith('https://')) {
        if (!image.startsWith('data:image')) {
            imageUrl = `data:image/png;base64,${image}`;
        } else {
            imageUrl = image;
        }
    }

    const stream = await client.chat.completions.create({
        model: model,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: { url: imageUrl }
                    },
                    {
                        type: 'text',
                        text: `Extraia os dados do gráfico e retorne APENAS JSON válido, incluindo o array "candles" com todos os candles visíveis.`
                    }
                ]
            }
        ],
        stream: true,
        extra_body: {
            enable_thinking: false
        }
    });

    let fullContent = '';
    
    for await (const chunk of stream) {
        if (chunk.choices && chunk.choices[0]?.delta?.content) {
            fullContent += chunk.choices[0].delta.content;
        }
    }

    return fullContent;
}

module.exports = { vision, visionStream };