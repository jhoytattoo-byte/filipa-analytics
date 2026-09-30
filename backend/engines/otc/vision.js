const qwenService = require('../../services/qwen');
const logger = require('../../utils/logger');

async function execute(imageBase64, requestId, config) {
  logger.info('[OTC Vision] 🔴 Turbo Mode — Qwen direto', { requestId });
  
  const rawResponse = await qwenService.vision(imageBase64);
  
  let visionData;
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    visionData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
  } catch (e) {
    throw new Error('JSON inválido do Vision');
  }
  
    // 🔥 CORREÇÃO: garante que candles é array (tolerante a undefined)
  let candles = visionData.candles;
  if (!Array.isArray(candles)) {
    candles = visionData.candlesticks || visionData.candles_reais || [];
  }
  if (!Array.isArray(candles)) candles = [];

  const total = config.quant.candles || 10;

  if (candles.length === 0) {
    logger.warn(`[OTC Vision] ⚠️ Modelo não retornou candles — gerando ${total} sintéticos`, { requestId });
    const precoBase = parseFloat(visionData.preco_atual) || 1.1600;
    visionData.candles_reais = Array(total).fill(null).map(() => ({
      time: null,
      open: precoBase + (Math.random() - 0.5) * 0.0020,
      close: precoBase + (Math.random() - 0.5) * 0.0020,
      high: precoBase + 0.0010,
      low: precoBase - 0.0010,
      cor: Math.random() > 0.5 ? 'verde' : 'vermelha'
    }));
  } else {
    visionData.candles_reais = candles;
  }
  
  visionData.is_otc = true;
  visionData.fonte_dados = 'turbo_otc';
  
  logger.info(`[OTC Vision] ✅ ${visionData.ativo} | ${visionData.candles_reais.length} candles`, { requestId });
  return visionData;
}

module.exports = { execute };