const quantEngine = require('../quantEngine');
const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Forex Quant] Usando quantEngine padrão (Forex)', { requestId });
  
  const candles = visionData.candles_reais || [];
  
  // 🔥 FASE 3: guarda contra candles vazios/insuficientes
  if (!Array.isArray(candles) || candles.length < 5) {
    logger.warn(`[Forex Quant] ⚠️ Candles insuficientes (${candles.length}) — retornando NEUTRO`, { requestId });
    return {
      score: 0,
      rsi: 50,
      confidence: null,
      candles_validos: candles.length,
      direcao_quant: 'NEUTRO'
    };
  }
  
  const result = quantEngine.analyze(candles);
  
  logger.info(`[Forex Quant] ✅ Score: ${result.score}, RSI: ${result.rsi}`, { requestId });
  return result;
}

module.exports = { execute };