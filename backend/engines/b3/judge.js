const logger = require('../../utils/logger');

async function execute(data, requestId, config) {
    const { visao, quant } = data;
    logger.info('[B3 Judge] Decisão com cálculo em PONTOS', { requestId });
    
    const score = quant.score || 0;
    const rsi = quant.rsi || 50;
    const confianca = quant.confidence || 70;
    
    let direcao = 'NEUTRO';
    let qualidade = 'C';
    
    if (score >= 2 && rsi < 40) { direcao = 'COMPRA'; qualidade = 'A'; }
    else if (score <= -2 && rsi > 60) { direcao = 'VENDA'; qualidade = 'A'; }
    else if (score > 0) { direcao = 'COMPRA'; qualidade = 'B'; }
    else if (score < 0) { direcao = 'VENDA'; qualidade = 'B'; }
    
    // 🔧 CORREÇÃO: Se a IA retornou preço < 1000, provavelmente cortou os zeros
    let preco = visao.preco_atual || 120000;
    if (preco < 1000) {
        preco = preco * 1000; // Converte 174 -> 174000
        logger.info('[B3 Judge] Preço ajustado (IA cortou zeros):', preco);
    }
    
    const slPoints = config.risk.default_sl_points || 100;
    const tpPoints = config.risk.default_tp_points || 200;
    
    return {
        direcao,
        confianca,
        qualidade,
        timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
        justificativa: `B3: RSI ${rsi}, Score ${score}. SL ${slPoints}pts, TP ${tpPoints}pts.`,
        estrategia: {
            preco_atual: preco,
            stop_loss: direcao === 'VENDA' ? preco + slPoints : preco - slPoints,
            alvo1: direcao === 'VENDA' ? preco - tpPoints : preco + tpPoints,
            entrada: 'AGORA',
            points_mode: true
        }
    };
}

module.exports = { execute };