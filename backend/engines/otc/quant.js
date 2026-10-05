// engines/otc/quant.js — Caminho absoluto garantido + guarda contra vazio
const path = require('path');
const logger = require(path.join(__dirname, '..', '..', 'utils', 'logger'));

// Caminho absoluto para o quantEngine_otc na raiz de engines/
const quantEnginePath = path.join(__dirname, '..', 'quantEngine_otc');
const quantEngineOTC = require(quantEnginePath);

async function execute(visionData, requestId, config) {
  logger.info('[OTC Quant] Usando quantEngine_otc.analyzeOTC', { requestId });
  
  const candles = visionData.candles_reais || [];
  
  // 🔥 FASE 3: guarda contra candles vazios/insuficientes
  if (!Array.isArray(candles) || candles.length < 5) {
    logger.warn(`[OTC Quant] ⚠️ Candles insuficientes (${candles.length}) — retornando NEUTRO`, { requestId });
    return {
      score: 0,
      rsi: 50,
      confidence: null,
      candles_validos: candles.length,
      direcao_quant: 'NEUTRO'
    };
  }
  
  try {
    const result = quantEngineOTC.analyzeOTC(candles);
    
    const finalResult = result && typeof result.then === 'function' 
      ? await result 
      : result;
    
    logger.info(`[OTC Quant] ✅ Score: ${finalResult?.score}, RSI: ${finalResult?.rsi}`, { requestId });
    return finalResult;
  } catch (e) {
    logger.error(`[OTC Quant] ❌ Erro: ${e.message}`, { requestId });
    return {
      score: 0,
      rsi: 50,
      confidence: null,
      candles_validos: candles.length,
      direcao_quant: 'NEUTRO'
    };
  }
}

module.exports = { execute };