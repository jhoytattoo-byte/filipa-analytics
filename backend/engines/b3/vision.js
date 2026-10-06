const groqService = require('../../services/groq');
const qwenService = require('../../services/qwen');
const logger = require('../../utils/logger');

async function execute(imageBase64, requestId, config) {
    logger.info('[B3 Vision] Análise B3 (Groq + fallback Qwen)', { requestId });
    
    let rawResponse;
    let fonte = 'groq';
    
    // 🔥 1º: Groq Vision (GRÁTIS)
    try {
        rawResponse = await groqService.vision(imageBase64);
        logger.info('[B3 Vision] ✅ Groq Vision OK (GRÁTIS)', { requestId });
    } catch (e) {
        logger.warn(`[B3 Vision] ⚠️ Groq Vision falhou: ${e.message}`, { requestId });
        
        // 🔥 2º: Qwen Cloud (PAGO — fallback)
        try {
            logger.info('[B3 Vision] 🔴 Tentando Qwen Cloud (fallback)', { requestId });
            rawResponse = await qwenService.vision(imageBase64);
            fonte = 'qwen';
            logger.info('[B3 Vision] ✅ Qwen OK (PAGO)', { requestId });
        } catch (e2) {
            logger.error(`[B3 Vision] ❌ Qwen também falhou: ${e2.message}`, { requestId });
            throw new Error('Vision falhou (Groq + Qwen)');
        }
    }
    
    let visionData;
    
    try {
        logger.info('[B3 Vision] Parseando resposta...', { rawLength: rawResponse.length });
        
        const jsonMatch = rawResponse.match(/{[\s\S]*}/);
        
        if (jsonMatch) {
            visionData = JSON.parse(jsonMatch[0]);
            logger.info('[B3 Vision] ✅ JSON extraído com sucesso');
        } else {
            visionData = JSON.parse(rawResponse);
            logger.info('[B3 Vision] ✅ JSON direto parseado');
        }
    } catch (e) {
        logger.error('[B3 Vision] ❌ Erro ao parsear JSON', { 
            error: e.message,
            rawResponse: rawResponse.substring(0, 500)
        });
        
        // Fallback seguro
        visionData = {
            ativo: 'WINV26',
            timeframe: '15m',
            preco_atual: 175000,
            candles: [],
            tendencia: 'INDEFINIDA',
            rsi: 50
        };
        
        logger.warn('[B3 Vision] Usando dados padrão');
    }
    
    // 🔥 FASE 2: Usa candles REAIS (não inventa)
    if (visionData.candles && Array.isArray(visionData.candles) && visionData.candles.length >= 5) {
        visionData.candles_reais = visionData.candles.map(c => ({
            time: null,
            open: parseFloat(c.open) || 0,
            close: parseFloat(c.close) || 0,
            high: parseFloat(c.high) || 0,
            low: parseFloat(c.low) || 0,
            cor: c.cor || (parseFloat(c.close) > parseFloat(c.open) ? 'verde' : 'vermelha')
        }));
        logger.info(`[B3 Vision] ✅ Usando ${visionData.candles_reais.length} candles REAIS (${fonte})`, { requestId });
    } else {
        logger.warn(`[B3 Vision] ⚠️ Modelo não retornou candles suficientes (${visionData.candles?.length || 0}) — retornando vazio`, { requestId });
        visionData.candles_reais = [];
    }
    
    visionData.is_otc = false;
    visionData.fonte_dados = 'visual_b3';
    visionData.points_mode = true;
    
    logger.info(`[B3 Vision] ✅ ${visionData.ativo} | ${visionData.candles_reais.length} candles (${fonte})`, { requestId });
    return visionData;
}

module.exports = { execute };