const qwenService = require('../../services/qwen');
const logger = require('../../utils/logger');

async function execute(imageBase64, requestId, config) {
  logger.info('[Crypto Vision] Qwen + padrões cripto (alta volatilidade)', { requestId });
  
  const rawResponse = await qwenService.vision(imageBase64);
  
  let visionData;
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    visionData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
  } catch (e) {
    throw new Error('JSON inválido do Vision');
  }
  
  // 🔥 FASE 2: garante que candles é array (tolerante a undefined)
  let candles = visionData.candles;
  if (!Array.isArray(candles)) {
    candles = visionData.candlesticks || visionData.candles_reais || [];
  }
  if (!Array.isArray(candles)) candles = [];

  // 🔥 FASE 2: usa candles REAIS do Qwen (não inventa)
  if (candles.length >= 5) {
    visionData.candles_reais = candles.map(c => ({
      time: null,
      open: parseFloat(c.open) || 0,
      close: parseFloat(c.close) || 0,
      high: parseFloat(c.high) || 0,
      low: parseFloat(c.low) || 0,
      cor: c.cor || (parseFloat(c.close) > parseFloat(c.open) ? 'verde' : 'vermelha')
    }));
    logger.info(`[Crypto Vision] ✅ Usando ${visionData.candles_reais.length} candles REAIS do Qwen`, { requestId });
  } else {
    // ❌ Sem candles do Qwen — retorna vazio (NÃO INVENTA)
    logger.warn(`[Crypto Vision] ⚠️ Qwen não retornou candles suficientes (${candles.length}) — retornando vazio`, { requestId });
    visionData.candles_reais = [];
  }
  
  visionData.is_otc = false;
  visionData.fonte_dados = 'visual_crypto';
  visionData.percent_mode = true; // Crypto usa percentual
  
  logger.info(`[Crypto Vision] ✅ ${visionData.ativo} | ${visionData.candles_reais.length} candles`, { requestId });
  return visionData;
}

module.exports = { execute };