const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[B3 Curator] Contexto B3/CEI', { requestId });
  
  // Força o cálculo da hora no fuso horário de Brasília
  const dataBrasilia = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const hora = new Date(dataBrasilia).getHours();

  const sessao = (hora >= 10 && hora < 18) ? 'B3 Aberta (10h-18h)' : 'B3 Fechada'; 
  
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