const quantEngine = require('../quantEngine');
const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Forex Quant] Usando quantEngine padrão (Forex)', { requestId });
  
  const candles = visionData.candles_reais || [];
  const result = quantEngine.analyze(candles);
  
  logger.info(`[Forex Quant] ✅ Score: ${result.score}, RSI: ${result.rsi}`, { requestId });
  return result;
}

module.exports = { execute };