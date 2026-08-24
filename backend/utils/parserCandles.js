const logger = require('./logger');

function extrairCandlesVisuais(visionData) {
  if (!visionData) {
    logger.warn('[ParserCandles] ⚠️ visionData é null/undefined');
    return [];
  }
  
  // Tenta diferentes formatos de candles
  let candles = [];
  
  if (Array.isArray(visionData.candles) && visionData.candles.length > 0) {
    candles = visionData.candles.map(c => ({
      time: null,
      open: parseFloat(c.open || c.O || 0),
      high: parseFloat(c.high || c.H || 0),
      low: parseFloat(c.low || c.L || 0),
      close: parseFloat(c.close || c.C || 0),
      cor: c.cor || c.color || (parseFloat(c.close || c.C) >= parseFloat(c.open || c.O) ? 'verde' : 'vermelha')
    })).filter(c => c.open > 0 && c.close > 0);
  }
  
  logger.info(`[ParserCandles] ✅ ${candles.length} candles processados`);
  return candles;
}

module.exports = { extrairCandlesVisuais };