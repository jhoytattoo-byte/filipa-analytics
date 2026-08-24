const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Stocks Curator] Contexto de mercado de ações', { requestId });
  
  return {
    regime: 'LATERAL',
    volatilidade: 'NORMAL',
    sessao: 'NYSE/NASDAQ (10:30 - 17:00 BRT)',
    noticias: 'Sem noticias relevantes',
    source: 'local_default'
  };
}

module.exports = { execute };