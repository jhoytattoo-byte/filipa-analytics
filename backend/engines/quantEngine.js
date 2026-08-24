// ============================================================
// ENGINE — QUANT FOREX (Básica)
// ============================================================
const logger = require('../utils/logger');

function calcularRSI(candles, periodo = 14) {
  if (!candles || candles.length < periodo + 1) return null;
  
  let ganhos = 0;
  let perdas = 0;
  
  for (let i = candles.length - periodo; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) ganhos += diff;
    else perdas += Math.abs(diff);
  }
  
  if (perdas === 0) return 100;
  const rs = ganhos / perdas;
  return Math.round(100 - (100 / (1 + rs)));
}

function analyze(candles) {
  logger.info(`[QuantForex] Analisando ${candles?.length || 0} candles`);
  
  if (!candles || candles.length < 5) {
    return {
      score: 0,
      rsi: 50,
      confidence: 40,
      candles_validos: candles?.length || 0,
      direcao_quant: 'NEUTRO',
      fonte: 'forex_insuficiente'
    };
  }
  
  const rsi = calcularRSI(candles) || 50;
  
  // Análise simples de tendência
  const ultimos = candles.slice(-10);
  const verdes = ultimos.filter(c => c.close > c.open).length;
  
  let score = 0;
  if (verdes >= 7) score = 3;
  else if (verdes >= 6) score = 2;
  else if (verdes >= 5) score = 1;
  else if (verdes <= 3) score = -2;
  else if (verdes <= 4) score = -1;
  
  // Ajuste por RSI
  if (rsi < 30) score += 1;
  else if (rsi > 70) score -= 1;
  
  let direcao = 'NEUTRO';
  let confidence = 50;
  
  if (score >= 2) {
    direcao = 'COMPRA';
    confidence = 65 + (score * 5);
  } else if (score <= -2) {
    direcao = 'VENDA';
    confidence = 65 + (Math.abs(score) * 5);
  } else if (score > 0) {
    direcao = 'COMPRA';
    confidence = 55 + (score * 5);
  } else if (score < 0) {
    direcao = 'VENDA';
    confidence = 55 + (Math.abs(score) * 5);
  }
  
  confidence = Math.max(40, Math.min(80, Math.round(confidence)));
  
  return {
    score,
    rsi,
    confidence,
    candles_validos: candles.length,
    direcao_quant: direcao,
    fonte: 'forex_engine_basica'
  };
}

module.exports = { analyze };