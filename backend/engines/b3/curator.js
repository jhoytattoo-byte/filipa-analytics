const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[B3 Curator] Contexto B3/CEI', { requestId });
  
  const agora = new Date();
// Converte para horário de Brasília (UTC-3) SEMPRE
const utcTime = agora.getTime() + (agora.getTimezoneOffset() * 60000);
const brasiliaTime = new Date(utcTime + (-3 * 60 * 60000));
const hora = brasiliaTime.getHours();
const sessao = (hora >= 10 && hora < 17) ? 'B3 Aberta (10h-17h)' : 'B3 Fechada';
  
  return {
    regime: 'LATERAL',
    volatilidade: 'NORMAL',
    sessao: sessao,
    noticias: 'Sem noticias relevantes',
    source: 'local_default',
    market_hours: '10:00-17:00 BRT'
  };
}

module.exports = { execute };
