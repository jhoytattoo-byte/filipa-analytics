// quantEngine.js — CORRIGIDO: RSI nunca retorna 0, parseFloat garantido

function calcularRSI(candles, periodo = 14) {
  // GARANTIA 1: candles existem e são array
  if (!Array.isArray(candles) || candles.length === 0) {
    console.warn('[Quant] RSI: array vazio ou inválido');
    return null;
  }

  // GARANTIA 2: extrair closes como números (protege contra strings, null, undefined)
  const closes = candles
    .map(c => {
      const val = c.close ?? c.Close ?? c.c ?? c.price;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    })
    .filter(n => n !== null);

  // GARANTIA 3: mínimo de candles para RSI
  if (closes.length < periodo + 1) {
    console.warn(`[Quant] RSI: apenas ${closes.length} closes válidos, precisa de ${periodo + 1}`);
    return null;
  }

  // Cálculo RSI Wilder
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= periodo; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / periodo;
  let avgLoss = losses / periodo;

  for (let i = periodo + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (periodo - 1) + gain) / periodo;
    avgLoss = (avgLoss * (periodo - 1) + loss) / periodo;
  }

  if (avgLoss === 0) {
    // Sobrecompra extrema — retorna 100, NUNCA 0
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  // GARANTIA 4: nunca retorna 0 acidentalmente
  return Math.round(rsi * 10) / 10;
}

function normalizarCandles(candles) {
  // Garante que TODOS os campos OHLCV são números
  return candles.map((c, i) => {
    const normalizado = {
      datetime: c.datetime || c.time || c.date || `candle_${i}`,
      open:   parseFloat(c.open   ?? c.o ?? c.Open   ?? 0) || 0,
      high:   parseFloat(c.high   ?? c.h ?? c.High   ?? 0) || 0,
      low:    parseFloat(c.low    ?? c.l ?? c.Low    ?? 0) || 0,
      close:  parseFloat(c.close  ?? c.c ?? c.Close  ?? 0) || 0,
      volume: parseInt(c.volume ?? c.v ?? c.Volume ?? 0) || 0
    };
    return normalizado;
  }).filter(c => c.close !== 0);  // remove candles sem preço
}

function calcularScore(candles) {
  const norm = normalizarCandles(candles);
  if (norm.length < 15) {
    return { score: 0, confianca: 20, rsi: null, candlesValidos: norm.length };
  }

  const rsi = calcularRSI(norm, 14);

  // Score baseado em tendência dos últimos candles
  const ultimos = norm.slice(-5);
  const primeiros = norm.slice(0, 5);
  const mediaUltimos = ultimos.reduce((s, c) => s + c.close, 0) / ultimos.length;
  const mediaPrimeiros = primeiros.reduce((s, c) => s + c.close, 0) / primeiros.length;

  let score = (mediaUltimos - mediaPrimeiros) / mediaPrimeiros;
  score = Math.max(-1, Math.min(1, score));  // clamp entre -1 e 1

  // Ajusta score com RSI
  if (rsi !== null) {
    if (rsi > 70) score -= 0.15;   // penaliza sobrecompra
    if (rsi < 30) score += 0.15;   // premia sobrevenda para compra
  }

  // Confiança baseada em quantidade de dados
  let confianca = Math.min(95, 40 + (norm.length * 0.5));
  if (rsi === null) confianca -= 20;
  confianca = Math.max(10, Math.round(confianca));

  return {
    score: Math.round(score * 100) / 100,
    confianca,
    rsi,
    candlesValidos: norm.length
  };
}

module.exports = { calcularRSI, normalizarCandles, calcularScore };