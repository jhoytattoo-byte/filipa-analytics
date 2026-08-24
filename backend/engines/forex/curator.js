const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Forex Curator] Contexto de mercado Forex', { requestId });
  
  return {
    regime: 'LATERAL',
    volatilidade: 'NORMAL',
    sessao: 'Londres / Nova York',
    noticias: 'Sem noticias relevantes',
    source: 'local_default'
  };
}

module.exports = { execute };