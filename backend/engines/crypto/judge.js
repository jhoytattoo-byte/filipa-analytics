const logger = require('../../utils/logger');

async function execute(data, requestId, config) {
  const { visao, quant } = data;
  
  logger.info('[Crypto Judge] Decisão para criptomoedas (percentual)', { requestId });
  
  const score = quant.score || 0;
  const rsi = quant.rsi || 50;
  const confianca = quant.confidence || 70;
  
  let direcao = 'NEUTRO';
  let qualidade = 'C';
  
  if (score >= 2 && rsi < 40) { direcao = 'COMPRA'; qualidade = 'A'; }
  else if (score <= -2 && rsi > 60) { direcao = 'VENDA'; qualidade = 'A'; }
  else if (score > 0) { direcao = 'COMPRA'; qualidade = 'B'; }
  else if (score < 0) { direcao = 'VENDA'; qualidade = 'B'; }
  
  const preco = visao.preco_atual || 60000;
  const slPercent = config.risk.default_sl_percent || 2;
  const tpPercent = config.risk.default_tp_percent || 5;
  
  const slValue = preco * (slPercent / 100);
  const tpValue = preco * (tpPercent / 100);
  
  return {
    direcao,
    confianca,
    qualidade,
    timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
    justificativa: `Crypto: RSI ${rsi}, Score ${score}. SL ${slPercent}%, TP ${tpPercent}%.`,
    estrategia: {
      preco_atual: preco,
      stop_loss: direcao === 'VENDA' ? preco + slValue : preco - slValue,
      alvo1: direcao === 'VENDA' ? preco - tpValue : preco + tpValue,
      entrada: 'AGORA',
      percent_mode: true
    }
  };
}

module.exports = { execute };