// ============================================================
// ENGINE — CURATOR (Contexto de Mercado)
// ============================================================
const logger = require('../utils/logger');

async function getContext(ativo, timeframe) {
  try {
    logger.info(`[CuratorEngine] Buscando contexto para ${ativo} (${timeframe})...`);
    
    // Por padrão, retorna um contexto neutro/seguro. 
    // Aqui você pode adicionar integrações futuras com APIs de notícias ou calendário econômico.
    const contexto = {
      ativo: ativo,
      timeframe: timeframe,
      regime: 'LATERAL',        // Pode ser: TENDENCIA_ALTA, TENDENCIA_BAIXA, LATERAL
      volatilidade: 'NORMAL',   // Pode ser: ALTA, MEDIA, BAIXA, NORMAL
      sentimento: 'NEUTRO',     // Pode ser: BULLISH, BEARISH, NEUTRO
      noticias_relevantes: [],
      suportes_resistencias: [],
      source: 'local_default'
    };

    logger.info(`[CuratorEngine] ✅ Contexto obtido: Regime=${contexto.regime}, Volatilidade=${contexto.volatilidade}`);
    return contexto;
    
  } catch (error) {
    logger.error(`[CuratorEngine] Erro ao buscar contexto: ${error.message}`);
    
    // Retorna fallback seguro em caso de erro
    return {
      ativo: ativo,
      timeframe: timeframe,
      regime: 'NEUTRO',
      volatilidade: 'NORMAL',
      sentimento: 'NEUTRO',
      noticias_relevantes: [],
      suportes_resistencias: [],
      source: 'fallback'
    };
  }
}

module.exports = { getContext };