const logger = require('../../utils/logger');

async function execute(data, requestId, config) {
  const { visao, quant, contexto } = data;
  
  logger.info('[OTC Judge] Decisão local rápida', { requestId });
  
  const score = quant.score || 0;
  const rsi = quant.rsi || 50;
  const confianca = quant.confidence || 70;
  
  let direcao = 'NEUTRO';
  let qualidade = 'C';
  
  if (score >= 2 && rsi < 40) { direcao = 'COMPRA'; qualidade = 'A'; }
  else if (score <= -2 && rsi > 60) { direcao = 'VENDA'; qualidade = 'A'; }
  else if (score > 0) { direcao = 'COMPRA'; qualidade = 'B'; }
  else if (score < 0) { direcao = 'VENDA'; qualidade = 'B'; }
  
  const preco = visao.preco_atual || 1.1600;
  const slPips = config.risk.default_sl_pips || 30;
  const tpPips = config.risk.default_tp_pips || 40;
  
  return {
    direcao,
    confianca,
    qualidade,
    timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
    justificativa: `RSI ${rsi}, Score ${score}. Padrão OTC detectado.`,
    estrategia: {
      preco_atual: preco,
      stop_loss: direcao === 'VENDA' ? preco + (slPips * 0.0001) : preco - (slPips * 0.0001),
      alvo1: direcao === 'VENDA' ? preco - (tpPips * 0.0001) : preco + (tpPips * 0.0001),
      entrada: 'AGORA'
    }
  };
}

module.exports = { execute };