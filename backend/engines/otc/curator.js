const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[OTC Curator] Contexto local apenas', { requestId });
  
  return {
    regime: 'LATERAL',
    volatilidade: 'NORMAL',
    sessao: 'Europa + EUA',
    noticias: 'Sem noticias relevantes',
    source: 'local_default'
  };
}

module.exports = { execute };