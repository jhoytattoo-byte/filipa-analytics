const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Commodities Curator] Contexto de mercado de Commodities', { requestId });
  
  return {
    regime: 'LATERAL',
    volatilidade: 'NORMAL',
    sessao: 'Global (24h)',
    noticias: 'Sem noticias relevantes',
    source: 'local_default'
  };
}

module.exports = { execute };