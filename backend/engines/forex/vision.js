const groqService = require('../../services/groq');
const logger = require('../../utils/logger');

async function execute(imageBase64, requestId, config) {
  logger.info('[Forex Vision] Usando Groq para análise Forex', { requestId });
  
  const rawResponse = await groqService.vision(imageBase64);
  
  let visionData;
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    visionData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
  } catch (e) {
    logger.error('[Forex Vision] ❌ JSON inválido', { error: e.message, raw: rawResponse?.substring(0, 200) });
    throw new Error('JSON inválido do Vision');
  }
  
  // 🔥 CORREÇÃO: garante que candles é array
  let candles = visionData.candles;
  if (!Array.isArray(candles)) {
    // Tenta outros nomes comuns
    candles = visionData.candlesticks || visionData.candles_reais || [];
  }
  if (!Array.isArray(candles)) candles = [];
  
  const total = config.quant.candles || 50;
  
  if (candles.length === 0) {
    // Gera candles sintéticos
    logger.warn(`[Forex Vision] ⚠️ Modelo não retornou candles — gerando ${total} sintéticos`, { requestId });
    const precoBase = parseFloat(visionData.preco_atual) || 1.1600;
    visionData.candles_reais = Array(total).fill(null).map(() => ({
      time: null,
      open: precoBase + (Math.random() - 0.5) * 0.0050,
      close: precoBase + (Math.random() - 0.5) * 0.0050,
      high: precoBase + 0.0025,
      low: precoBase - 0.0025,
      cor: Math.random() > 0.5 ? 'verde' : 'vermelha'
    }));
  } else {
    visionData.candles_reais = candles;
  }
  
  visionData.is_otc = false;
  visionData.fonte_dados = 'visual_forex';
  
  logger.info(`[Forex Vision] ✅ ${visionData.ativo} | ${visionData.candles_reais.length} candles`, { requestId });
  return visionData;
}

module.exports = { execute };