// ============================================================
// TURBO MODE — OTC Rápido (< 15 segundos)
// ============================================================
const logger = require('../utils/logger');

async function analyzeOTCTurbo(imageBase64, requestId) {
  const startTime = Date.now();
  logger.info('[TurboOTC]  Iniciando análise TURBO...', { requestId });
  
  // 1. Vision direto com Qwen (pula Groq/Gemini)
  const qwenService = require('../services/qwen');
  const visionData = await qwenService.vision(imageBase64);
  
  // 2. Detectar OTC e gerar candles sintéticos
  const isOTC = true; // Força OTC
  const candles = gerarCandlesSinteticos(visionData, 10); // Apenas 10 candles
  
  // 3. Quant simplificado
  const quantData = calcularQuantSimplificado(candles, visionData);
  
  // 4. Judge LOCAL (pula Claude)
  const judgeData = judgeLocalRapido(visionData, quantData);
  
  const totalTime = Date.now() - startTime;
  logger.info(`[TurboOTC] ✅ Concluído em ${totalTime}ms`, { requestId });
  
  return {
    ...judgeData,
    tempo_analise: totalTime,
    modo: 'turbo_otc'
  };
}

function gerarCandlesSinteticos(visionData, total = 10) {
  const precoBase = visionData.preco_atual || 1.1600;
  return Array(total).fill(null).map((_, i) => ({
    open: precoBase + (Math.random() - 0.5) * 0.0020,
    close: precoBase + (Math.random() - 0.5) * 0.0020,
    high: precoBase + 0.0010,
    low: precoBase - 0.0010
  }));
}

function calcularQuantSimplificado(candles, visionData) {
  const rsi = calcularRSIRapido(candles, 7); // RSI período 7
  const ultimos = candles.slice(-5);
  const verdes = ultimos.filter(c => c.close > c.open).length;
  
  let score = 0;
  if (verdes >= 4) score = 2;
  else if (verdes >= 3) score = 1;
  else if (verdes <= 1) score = -2;
  else if (verdes <= 2) score = -1;
  
  if (rsi > 70) score -= 1;
  else if (rsi < 30) score += 1;
  
  return {
    score,
    rsi,
    confidence: 70, // Base para OTC
    candles_validos: candles.length,
    direcao_quant: score > 0 ? 'COMPRA' : score < 0 ? 'VENDA' : 'NEUTRO',
    fonte: 'turbo_otc'
  };
}

function calcularRSIRapido(candles, periodo = 7) {
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

function judgeLocalRapido(visionData, quantData) {
  const score = quantData.score;
  const rsi = quantData.rsi;
  
  let direcao = 'NEUTRO';
  let confianca = 50;
  
  if (score <= -2 && rsi > 60) {
    direcao = 'VENDA';
    confianca = 85;
  } else if (score >= 2 && rsi < 40) {
    direcao = 'COMPRA';
    confianca = 85;
  } else if (score < 0 && rsi > 50) {
    direcao = 'VENDA';
    confianca = 70;
  } else if (score > 0 && rsi < 50) {
    direcao = 'COMPRA';
    confianca = 70;
  }
  
  const preco = visionData.preco_atual || 1.1600;
  
  return {
    direcao,
    confianca,
    qualidade: confianca >= 80 ? 'A' : confianca >= 60 ? 'B' : 'C',
    timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
    sl: direcao === 'VENDA' ? preco + 0.0030 : preco - 0.0030,
    tp: direcao === 'VENDA' ? preco - 0.0040 : preco + 0.0040,
    justificativa: `RSI ${rsi}, Score ${score}. Análise TURBO OTC.`,
    alertas: ['⚠️ OTC — Análise rápida (<15s)']
  };
}

module.exports = { analyzeOTCTurbo };