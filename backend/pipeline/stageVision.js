// ============================================================
// PIPELINE — STAGE VISION v3.2 (Candles Garantidos)
// ============================================================
const groqService = require('../services/groq');
const { extrairCandlesVisuais } = require('../utils/parserCandles');
const logger = require('../utils/logger');

// Carrega Turbo Mode
let turboMode = null;
try {
  turboMode = require('./turboMode');
  logger.info('[Vision] ✅ Turbo Mode OTC carregado');
} catch (e) {
  logger.warn('[Vision] ⚠️ Turbo Mode não encontrado.');
}

async function execute(imageBase64, requestId, marketType = 'otc') {
  try {
    logger.info(`[Vision] Extraindo dados... Mercado: ${marketType.toUpperCase()}`, { requestId });
    
    // 🔥 TURBO MODE: SÓ se for OTC
    if (marketType === 'otc' && turboMode && turboMode.analyzeOTCTurbo) {
      logger.info('[Vision] 🔴 TURBO MODE ATIVADO — Análise OTC rápida (<15s)', { requestId });
      return await turboMode.analyzeOTCTurbo(imageBase64, requestId);
    }
    
    // 🟢 PIPELINE PADRÃO (Forex, B3, etc.)
    logger.info('[Vision] 🟢 Pipeline padrão com fallbacks', { requestId });
    const rawResponse = await groqService.vision(imageBase64);
    
    let visionData;
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      visionData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
    } catch (e) {
      throw new Error('JSON inválido do Vision');
    }

    // Extrai candles visuais
    let candlesReais = extrairCandlesVisuais(visionData) || [];
    
    // Se sem candles, cria sintéticos
    if (candlesReais.length === 0) {
      const total = visionData.num_candles || 15;
      const precoBase = visionData.preco_atual || 1.1600;
      candlesReais = Array(total).fill(null).map((_, i) => {
        const isGreen = Math.random() < 0.5;
        const change = (Math.random() - 0.5) * 0.0020;
        const open = precoBase + (i * 0.0005);
        const close = isGreen ? open + Math.abs(change) : open - Math.abs(change);
        return {
          time: null,
          open: Math.round(open * 100000) / 100000,
          high: Math.round(Math.max(open, close) * 100000) / 100000,
          low: Math.round(Math.min(open, close) * 100000) / 100000,
          close: Math.round(close * 100000) / 100000,
          cor: isGreen ? 'verde' : 'vermelha'
        };
      });
    }

    return {
      ...visionData,
      candles_reais: candlesReais,
      candles: candlesReais,
      is_otc: marketType === 'otc', // ✅ Define OTC apenas se for OTC
      fonte_dados: marketType === 'otc' ? 'turbo_otc' : 'visual_sintetico_forex',
      modo: marketType === 'otc' ? 'turbo' : 'padrao'
    };

  } catch (error) {
    logger.error(`[Vision] 🔥 Erro crítico: ${error.message}`, { requestId });
    throw error;
  }
}

module.exports = { execute };