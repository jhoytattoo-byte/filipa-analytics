const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Crypto Quant] Calculando indicadores para cripto', { requestId });
  
  const candles = visionData.candles_reais || [];
  const rsi = calcularRSI(candles, config.quant.rsi_period || 14);
  
  // Análise de momentum para crypto (mais sensível)
  const ultimos = candles.slice(-5);
  const verdes = ultimos.filter(c => c.close > c.open).length;
  
  let score = 0;
  if (verdes >= 4) score = 3;
  else if (verdes >= 3) score = 2;
  else if (verdes <= 1) score = -3;
  else if (verdes <= 2) score = -2;
  
  // Ajuste por RSI (crypto é mais volátil, thresholds diferentes)
  if (rsi > 75) score -= 1; // Sobrecompra mais extrema
  else if (rsi < 25) score += 1; // Sobrevenda mais extrema
  
  const result = {
    score,
    rsi,
    confidence: 70,
    candles_validos: candles.length,
    direcao_quant: score > 0 ? 'COMPRA' : score < 0 ? 'VENDA' : 'NEUTRO',
    percent_mode: true
  };
  
  logger.info(`[Crypto Quant] ✅ Score: ${score}, RSI: ${rsi}`, { requestId });
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
  const rs = ganhos / perdas;
  return Math.round(100 - (100 / (1 + rs)));
}

module.exports = { execute };