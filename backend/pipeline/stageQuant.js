// ============================================================
// PIPELINE — STAGE QUANT v2.0 (OTC-Optimized)
// ============================================================
const logger = require('../utils/logger');

// Tenta carregar engines de forma GRACEFUL
let quantEnginePadrao = null;
try {
  quantEnginePadrao = require('../engines/quantEngine');
  logger.info('[QuantAdapter] ✅ quantEngine v3.0 carregada');
} catch (e) {
  try {
    quantEnginePadrao = require('../services/quantEngine');
    logger.info('[QuantAdapter] ✅ quantEngine carregada de services/');
  } catch (e2) {
    logger.warn('[Quant] ⚠️ Engine padrão não encontrada. OTC engine será usada para OTC.');
  }
}

// Engine OTC (sempre disponível - criada por nós)
let quantEngineOTC = null;
try {
  quantEngineOTC = require('../engines/quantEngine_otc');
  logger.info('[QuantAdapter] ✅ quantEngine_otc carregada');
} catch (e) {
  logger.error('[Quant] 🔴 quantEngine_otc NÃO encontrada! Criando fallback...');
  // Fallback inline se o arquivo não existir
  quantEngineOTC = {
    analyzeOTC: function(candles, visao) {
      return {
        score: 0,
        rsi: visao?.rsi_estimado || 50,
        confidence: 40,
        candles_validos: candles?.length || 0,
        direcao_quant: 'NEUTRO',
        fonte: 'otc_fallback_minimo'
      };
    }
  };
}

async function execute(visao, requestId) {
  try {
    const isOTC = visao?.is_otc || false;
    const candles = visao?.candles_reais || [];
    const confiancaExtracao = visao?.confianca_extracao || 0;
    
    logger.info(`[Quant] 📊 Mercado: ${isOTC ? '🔴 OTC' : '🟢 Forex'} | Candles: ${candles.length} | ConfExtração: ${confiancaExtracao}%`, { requestId });

    let resultado;

    if (isOTC) {
      // ============================================
      // OTC: Usa engine especializada (dados visuais)
      // ============================================
      logger.info('[Quant] 🔴 OTC detectado — Usando quantEngine_otc', { requestId });
      
      if (candles.length === 0) {
        logger.warn('[Quant] ⚠️ OTC sem candles! Tentando extrair do visionData...', { requestId });
        // Tenta usar dados diretos do vision se candles_reais estiver vazio
        if (visao?.num_candles > 0 && visao?.candles_up !== undefined) {
          // Cria candles sintéticos baseados em estatísticas
          const totalCandles = visao.num_candles;
          const percentUp = visao.candles_up / totalCandles;
          resultado = {
            score: percentUp > 0.6 ? 2 : percentUp > 0.5 ? 1 : percentUp < 0.4 ? -2 : percentUp < 0.5 ? -1 : 0,
            rsi: visao.rsi_estimado || 50,
            confidence: Math.min(65, 40 + (visao.confianca_extracao || 50) / 10),
            candles_validos: totalCandles,
            direcao_quant: percentUp > 0.55 ? 'COMPRA' : percentUp < 0.45 ? 'VENDA' : 'NEUTRO',
            fonte: 'otc_estatisticas_vision'
          };
          logger.info(`[Quant] ✅ OTC estatísticas: score=${resultado.score}, conf=${resultado.confidence}%`, { requestId });
          return resultado;
        }
      }
      
      // Usa engine OTC normal
      resultado = quantEngineOTC.analyzeOTC(candles, visao);
      logger.info(`[Quant] ✅ OTC analysis: score=${resultado.score}, conf=${resultado.confidence}%, rsi=${resultado.rsi}`, { requestId });
      
    } else {
      // ============================================
      // Forex: Tenta engine padrão
      // ============================================
      logger.info('[Quant] 🟢 Forex detectado — Tentando engine padrão', { requestId });
      
      if (quantEnginePadrao) {
        try {
          if (typeof quantEnginePadrao.analyze === 'function') {
            resultado = quantEnginePadrao.analyze(candles);
          } else if (typeof quantEnginePadrao.calculate === 'function') {
            resultado = quantEnginePadrao.calculate(candles);
          } else if (typeof quantEnginePadrao === 'function') {
            resultado = quantEnginePadrao(candles);
          } else {
            throw new Error('Método de cálculo não encontrado');
          }
          logger.info(`[Quant] ✅ Forex engine padrão: score=${resultado.score || resultado.score_final}, conf=${resultado.confidence || resultado.confianca}%`, { requestId });
        } catch (e) {
          logger.error(`[Quant]  Engine padrão falhou: ${e.message}`, { requestId });
          resultado = createFallbackResult(candles, visao, 'forex_engine_error');
        }
      } else {
        logger.warn('[Quant] ⚠️ Engine padrão indisponível — Usando fallback', { requestId });
        resultado = createFallbackResult(candles, visao, 'forex_fallback');
      }
    }

    // Validação final
    if (!resultado || resultado.confidence === undefined) {
      logger.error('[Quant] 🔴 Resultado inválido! Criando resultado seguro...', { requestId });
      resultado = {
        score: 0,
        rsi: visao?.rsi_estimado || 50,
        confidence: 40,
        candles_validos: candles.length,
        direcao_quant: 'NEUTRO',
        fonte: 'quant_error_fallback'
      };
    }

    return resultado;

  } catch (error) {
    logger.error(`[Quant] 🔥 Erro crítico: ${error.message}`, { requestId });
    // Retorna resultado seguro em caso de erro catastrófico
    return {
      score: 0,
      rsi: 50,
      confidence: 30,
      candles_validos: 0,
      direcao_quant: 'NEUTRO',
      fonte: 'quant_critical_error'
    };
  }
}

// Função auxiliar para fallback
function createFallbackResult(candles, visao, fonte) {
  const rsi = visao?.rsi_estimado || 50;
  const confiancaExtracao = visao?.confianca_extracao || 50;
  
  // Lógica simples baseada em RSI
  let score = 0;
  let direcao = 'NEUTRO';
  
  if (rsi < 30) {
    score = 2;
    direcao = 'COMPRA';
  } else if (rsi > 70) {
    score = -2;
    direcao = 'VENDA';
  } else if (rsi < 40) {
    score = 1;
    direcao = 'COMPRA';
  } else if (rsi > 60) {
    score = -1;
    direcao = 'VENDA';
  }
  
  return {
    score,
    rsi,
    confidence: Math.max(35, Math.min(60, confiancaExtracao - 10)),
    candles_validos: candles.length,
    direcao_quant: direcao,
    fonte: fonte
  };
}

module.exports = { execute };