// ============================================================
// ENGINE — QUANT OTC (Baseado em Dados Visuais)
// ============================================================
const logger = require('../utils/logger');

function calcularRSI(candles, periodo = 14) {
  if (!candles || candles.length < periodo + 1) {
    // Fallback: estimativa baseada na proporção de velas verdes/vermelhas
    const verdes = candles.filter(c => c.close > c.open).length;
    const total = candles.length || 1;
    return Math.round(30 + (verdes / total) * 40); // Estima entre 30 e 70
  }

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

function analyzeOTC(candlesVisuais, visionData) {
  logger.info(`[QuantOTC] Analisando ${candlesVisuais?.length || 0} candles visuais`);

  if (!candlesVisuais || candlesVisuais.length < 5) {
    return {
      score: 0,
      rsi: visionData?.rsi_estimado || 50,
      confidence: 40,
      candles_validos: candlesVisuais?.length || 0,
      direcao_quant: 'NEUTRO',
      fonte: 'otc_visual_insuficiente'
    };
  }

  const rsi = calcularRSI(candlesVisuais);
  
  // Analisa força da tendência nos últimos 10 candles (ou menos se não houver 10)
  const ultimos = candlesVisuais.slice(-Math.min(10, candlesVisuais.length));
  const verdes = ultimos.filter(c => c.close > c.open).length;
  const vermelhos = ultimos.filter(c => c.close < c.open).length;

  let score = 0;

  // Lógica de pontuação baseada em sequência de cores
  if (verdes >= 7) score = 3;
  else if (verdes >= 6) score = 2;
  else if (verdes >= 5) score = 1;
  else if (vermelhos >= 7) score = -3;
  else if (vermelhos >= 6) score = -2;
  else if (vermelhos >= 5) score = -1;

  // Ajuste por RSI (Sobrevenda/Sobrecompra)
  if (rsi < 30) score += 1; // Potencial reversão para compra
  else if (rsi > 70) score -= 1; // Potencial reversão para venda

  // Determina direção e confiança
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

  // Limita confiança para OTC (mais conservador, máx 80%)
  confidence = Math.max(45, Math.min(80, Math.round(confidence)));

  return {
    score: score,
    rsi: rsi,
    confidence: confidence,
    candles_validos: candlesVisuais.length,
    direcao_quant: direcao,
    fonte: 'otc_visual_engine'
  };
}

module.exports = { analyzeOTC };