// ============================================================
// quantEngine_v3.0.js — FILIPA Quant Engine
// Calcula indicadores sobre dados reais (TwelveData) OU visuais (OTC)
// ============================================================

function calcularRSI(candles, period = 14) {
  if (!candles || candles.length < period + 1) {
    return { value: 50, valid: false, reason: 'poucos candles' };
  }

  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[candles.length - i].close - candles[candles.length - i].open;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return { value: 100, valid: true };

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return { 
    value: Math.round(rsi), 
    valid: true,
    avgGain: Math.round(avgGain * 10000) / 10000,
    avgLoss: Math.round(avgLoss * 10000) / 10000
  };
}

function calcularMACD(candles) {
  if (!candles || candles.length < 26) {
    return { histogram: 0, signal: 0, macd: 0, valid: false };
  }

  // Simplificado: usa médias móveis simples
  const ema12 = calcularEMA(candles, 12);
  const ema26 = calcularEMA(candles, 26);
  const macdLine = ema12 - ema26;
  const signalLine = macdLine * 0.9; // Aproximação
  const histogram = macdLine - signalLine;

  return {
    histogram: Math.round(histogram * 10000) / 10000,
    signal: Math.round(signalLine * 10000) / 10000,
    macd: Math.round(macdLine * 10000) / 10000,
    valid: true,
    tendencia: histogram > 0 ? 'ALTA' : 'BAIXA'
  };
}

function calcularEMA(candles, period) {
  const closes = candles.slice(-period).map(c => c.close);
  const k = 2 / (period + 1);
  let ema = closes[0];

  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return ema;
}

function calcularBandasBollinger(candles, period = 20) {
  if (!candles || candles.length < period) {
    return { upper: 0, middle: 0, lower: 0, valid: false };
  }

  const closes = candles.slice(-period).map(c => c.close);
  const sma = closes.reduce((a, b) => a + b, 0) / period;

  const squaredDiffs = closes.map(c => Math.pow(c - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: Math.round((sma + (stdDev * 2)) * 10000) / 10000,
    middle: Math.round(sma * 10000) / 10000,
    lower: Math.round((sma - (stdDev * 2)) * 10000) / 10000,
    valid: true,
    posicao: candles[candles.length - 1].close > sma ? 'ACIMA' : 'ABAIXO'
  };
}

function calcularScore(candles, rsi, macd, bb, visionData) {
  let score = 0;
  let fatores = [];

  // 1. Tendência de candles (peso 30%)
  const ultimos5 = candles.slice(-5);
  const verdes = ultimos5.filter(c => c.close > c.open).length;
  const vermelhos = ultimos5.filter(c => c.close < c.open).length;

  if (verdes >= 4) { score += 3; fatores.push('forte_tendencia_alta'); }
  else if (vermelhos >= 4) { score -= 3; fatores.push('forte_tendencia_baixa'); }
  else if (verdes > vermelhos) { score += 1; fatores.push('leve_tendencia_alta'); }
  else if (vermelhos > verdes) { score -= 1; fatores.push('leve_tendencia_baixa'); }

  // 2. RSI (peso 25%)
  if (rsi.valid) {
    if (rsi.value < 30) { score += 2; fatores.push('rsi_sobrevenda'); }
    else if (rsi.value > 70) { score -= 2; fatores.push('rsi_sobrecompra'); }
    else if (rsi.value < 45) { score += 1; fatores.push('rsi_favoravel_compra'); }
    else if (rsi.value > 55) { score -= 1; fatores.push('rsi_favoravel_venda'); }
  }

  // 3. MACD (peso 20%)
  if (macd.valid) {
    if (macd.histogram > 0 && macd.histogram > (macd.signal * 0.1)) {
      score += 2; fatores.push('macd_bullish');
    } else if (macd.histogram < 0 && macd.histogram < (macd.signal * 0.1)) {
      score -= 2; fatores.push('macd_bearish');
    }
  }

  // 4. Bollinger (peso 15%)
  if (bb.valid) {
    const close = candles[candles.length - 1].close;
    if (close <= bb.lower) { score += 1.5; fatores.push('preco_banda_inferior'); }
    else if (close >= bb.upper) { score -= 1.5; fatores.push('preco_banda_superior'); }
  }

  // 5. Padrão de candle (peso 10%)
  if (visionData.padrao_candle) {
    const padrao = visionData.padrao_candle.toLowerCase();
    if (['martelo', 'martelo_invertido', 'engolfo_alta', 'harami_alta', 'estrela_da_manha'].some(p => padrao.includes(p))) {
      score += 1; fatores.push('padrao_bullish');
    } else if (['estrela_cadente', 'engolfo_baixa', 'harami_baixa', 'estrela_da_tarde'].some(p => padrao.includes(p))) {
      score -= 1; fatores.push('padrao_bearish');
    }
  }

  // 6. OTC ajuste: se OTC e manipulação suspeita, reduz score
  if (visionData.is_otc && visionData.manipulacao_suspeita) {
    score *= 0.7;
    fatores.push('otc_manipulacao_suspeita');
  }

  return {
    score_final: Math.round(score * 10) / 10,
    score_raw: score,
    fatores,
    direcao: score > 1.5 ? 'COMPRA' : score < -1.5 ? 'VENDA' : 'NEUTRO',
    forca: Math.abs(score) > 3 ? 'FORTE' : Math.abs(score) > 1.5 ? 'MODERADA' : 'FRACA'
  };
}

async function quantEngine(visionData, realCandles = null) {
  console.log('[Quant v3.0] Iniciando...');

  // Usa candles reais se disponíveis (TwelveData), senão usa visuais
  const candles = realCandles && realCandles.length >= 15 
    ? realCandles 
    : (visionData.candles || []);

  const isVisual = !realCandles || realCandles.length < 15;

  console.log(`[Quant v3.0] Fonte: ${isVisual ? 'VISUAL (OTC)' : 'TWELVEDATA (real)'} | Candles: ${candles.length}`);

  // Se tem menos de 15 candles, ainda calcula mas marca como estimativa
  const dadosSuficientes = candles.length >= 15;

  const rsi = calcularRSI(candles, Math.min(14, candles.length - 1));
  const macd = calcularMACD(candles);
  const bb = calcularBandasBollinger(candles, Math.min(20, candles.length));
  const score = calcularScore(candles, rsi, macd, bb, visionData);

  return {
    success: true,
    rsi: rsi.valid ? rsi.value : visionData.rsi_estimado || 50,
    rsi_valido: rsi.valid,
    macd: macd.valid ? macd : { histogram: 0, signal: 0, macd: 0, valid: false },
    bollinger: bb.valid ? bb : { upper: 0, middle: 0, lower: 0, valid: false },
    score_final: score.score_final,
    score_raw: score.score_raw,
    fatores: score.fatores,
    direcao_quant: score.direcao,
    forca_quant: score.forca,
    num_candles: candles.length,
    fonte: isVisual ? 'visual_otc' : 'twelvedata_real',
    estimativa: isVisual || !dadosSuficientes,
    confianca_dados: dadosSuficientes ? (isVisual ? 65 : 90) : 40
  };
}

module.exports = { quantEngine };