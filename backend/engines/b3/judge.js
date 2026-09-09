const logger = require('../../utils/logger');
const motor = require('../motor'); // Importa o Motor de Decisão

async function execute(data, requestId, config) {
    const { visao, quant, contexto } = data;
    logger.info('[B3 Judge] Decisão usando MOTOR MATEMÁTICO', { requestId });
    
    const score = quant.score || 0;
    const rsi = quant.rsi || 50;
    const tendencia = contexto?.tendencia_macro || quant.tendencia || 'LATERAL';
    
    // 🔥 USANDO O MOTOR PARA CALCULAR TUDO
    const scoreFinal = motor.calcularScore({ tendencia, rsi });
    const confianca = motor.calcularConfidence(scoreFinal);
    const qualidade = motor.calcularQualidade(scoreFinal, confianca, true);
    const direcao = motor.calcularDirecao(scoreFinal);
    
    // 🔥 RISK GATE (Validação de dados e tendência)
    const ancoragemValida = contexto?.ancoragem_valida !== false;
    
    if (!ancoragemValida) {
        return {
            direcao: 'NEUTRO',
            confianca: 0,
            qualidade: 'D',
            timing: 'BLOQUEADO',
            justificativa: '⚠️ Dados reais divergem da imagem. Operação bloqueada.',
            estrategia: { preco_atual: null, stop_loss: null, alvo1: null, entrada: 'BLOQUEADO', points_mode: false }
        };
    }
    
    // 🔥 SE NÃO HÁ OPORTUNIDADE CLARA, RETORNA AGUARDAR
    if (direcao === 'AGUARDAR') {
        return {
            direcao: 'AGUARDAR',
            confianca: confianca,
            qualidade: qualidade,
            timing: 'AGUARDAR',
            justificativa: '⚠️ Não há oportunidade clara no momento. Aguarde um sinal mais forte.',
            estrategia: { preco_atual: null, stop_loss: null, alvo1: null, entrada: 'AGUARDAR', points_mode: false }
        };
    }
    
    // 🔧 CORREÇÃO: Se a IA retornou preço < 1000, provavelmente cortou os zeros
    let preco = visao.preco_atual || 120000;
    if (preco < 1000) {
        preco = preco * 1000;
        logger.info('[B3 Judge] Preço ajustado (IA cortou zeros):', preco);
    }
    
    if (contexto?.preco_real && contexto.preco_real > 1000) {
        preco = contexto.preco_real;
    }
    
    const slPoints = config.risk.default_sl_points || 100;
    const tpPoints = config.risk.default_tp_points || 200;
    
    return {
        direcao,
        confianca,
        qualidade,
        timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
        justificativa: `B3: RSI ${rsi}, Score ${scoreFinal}, Tendência ${tendencia}. Confiança calculada pelo motor.`,
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