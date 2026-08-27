const logger = require('../../utils/logger');

async function execute(visionData, requestId, config) {
  logger.info('[B3 Curator] Contexto B3/CEI', { requestId });
  
<<<<<<< HEAD
  // Força o cálculo da hora no fuso horário de Brasília
const dataBrasilia = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
const hora = new Date(dataBrasilia).getHours();

const sessao = (hora >= 10 && hora < 18) ? 'B3 Aberta (10h-18h)' : 'B3 Fechada'; 
// Nota: Ajustei para < 18, pois o mercado futuro vai até as 18:00
=======
  const agora = new Date();
// Converte para horário de Brasília (UTC-3) SEMPRE
const utcTime = agora.getTime() + (agora.getTimezoneOffset() * 60000);
const brasiliaTime = new Date(utcTime + (-3 * 60 * 60000));
const hora = brasiliaTime.getHours();
const sessao = (hora >= 10 && hora < 17) ? 'B3 Aberta (10h-17h)' : 'B3 Fechada';
>>>>>>> be2a95fe2876d8e4e2c9e2c109a34ad8f9bc3fcd
  
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
