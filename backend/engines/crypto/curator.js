const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[Crypto Curator] Contexto de mercado cripto (24/7)', { requestId });
  
  return {
    regime: 'LATERAL',
    volatilidade: 'ALTA', // Crypto é sempre mais volátil
    sessao: '24/7 (Mercado Aberto)',
    noticias: 'Sem noticias relevantes',
    source: 'local_default',
    market_hours: '24/7'
  };
}

module.exports = { execute };