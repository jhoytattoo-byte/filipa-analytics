// ============================================================
// PIPELINE v18.0 — Multi-Mercado com Router Dinâmico
// ============================================================
const router = require('./router');
const logger = require('../utils/logger');

async function execute(imageBase64, requestId, marketKey = 'otc') {
  try {
    const marketInfo = router.getMarketInfo(marketKey);
    logger.info(`[Pipeline] 🎯 Mercado: ${marketInfo.name} (${marketKey})`, { requestId });
    
    // Carrega engines específicas via router
    const engines = router.getEngines(marketKey);
    
    // 1. VISION
    logger.info('[1/5] Vision', { requestId });
    const visao = await engines.vision.execute(imageBase64, requestId, engines.config);
    
    // 2. QUANT
    logger.info('[2/5] Quant', { requestId });
    const quant = await engines.quant.execute(visao, requestId, engines.config);
    
    // 3. CURATOR
    logger.info('[3/5] Curator', { requestId });
    const contexto = await engines.curator.execute(visao, requestId, engines.config);
    
    // 4. JUDGE
    logger.info('[4/5] Judge', { requestId });
    const decisao = await engines.judge.execute({ visao, quant, contexto }, requestId, engines.config);
    
    // 5. LEARNING (genérico)
    logger.info('[5/5] Learning', { requestId });
    try {
      const learningEngine = require('./stageLearning');
      await learningEngine.execute({ visao, quant, contexto, decisao }, requestId);
    } catch (e) {
      logger.warn('[Learning] Falha ao salvar, continuando', { requestId });
    }
    
    return {
      success: true,
      data: {
        visao: {
          ativo: visao.ativo,
          timeframe: visao.timeframe,
          is_otc: marketKey === 'otc',
          tendencia: visao.tendencia,
          preco_atual: visao.preco_atual,
          candles_reais: visao.candles_reais || [],
          num_candles: visao.candles_reais?.length || 0
        },
        quant: {
          score: quant.score,
          confidence: quant.confidence,
          rsi: quant.rsi,
          candles_validos: quant.candles_validos,
          direcao_quant: quant.direcao_quant
        },
        curador: {
          regime: contexto.regime,
          volatilidade: contexto.volatilidade,
          sessao: contexto.sessao,
          noticias: contexto.noticias
        },
        decisao: {
          direcao: decisao.direcao,
          confianca: decisao.confianca,
          qualidade: decisao.qualidade,
          justificativa: decisao.justificativa,
          estrategia: decisao.estrategia,
          timing: decisao.timing
        }
      },
      meta: {
        marketKey,
        marketName: marketInfo.name,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    logger.error(`[Pipeline] 🔥 Erro: ${error.message}`, { requestId });
    throw error;
  }
}

module.exports = { execute };