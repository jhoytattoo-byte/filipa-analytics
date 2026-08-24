const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Stocks Quant] Calculando indicadores para ações', { requestId });
  
  const candles = visionData.candles_reais || [];
  const rsi = calcularRSI(candles, config.quant.rsi_period || 14);
  
  const ultimos = candles.slice(-5);
  const verdes = ultimos.filter(c => c.close > c.open).length;
  
  let score = 0;
  if (verdes >= 4) score = 2;
  else if (verdes >= 3) score = 1;
  else if (verdes <= 1) score = -2;
  else if (verdes <= 2) score = -1;
  
  if (rsi > 70) score -= 1;
  else if (rsi < 30) score += 1;
  
  const result = {
    score,
    rsi,
    confidence: 70,
    candles_validos: candles.length,
    direcao_quant: score > 0 ? 'COMPRA' : score < 0 ? 'VENDA' : 'NEUTRO'
  };
  
  logger.info(`[Stocks Quant] ✅ Score: ${score}, RSI: ${rsi}`, { requestId });
  return result;
}

function calcularRSI(candles, periodo = 14) {
  if (candles.length < periodo + 1) return 50;
  let ganhos = 0, perdas = 0;
  for (let i = candles.length - periodo; i < candles.length; i++) {
    const diff = candles[i].close - candles[i-1].close;
    if (diff > 0) ganhos += diff;
    else perdas += Math.abs(diff);
  }
  if (perdas === 0) return 100;
  return Math.round(100 - (100 / (1 + ganhos / perdas)));
}

module.exports = { execute };