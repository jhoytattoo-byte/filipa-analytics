const logger = require('../../utils/logger');
const motor = require('../motor'); // ✅ Importa o Motor de Decisão

async function execute(data, requestId, config) {
    const { visao, quant, contexto } = data;
    logger.info('[B3 Judge] Decisão usando MOTOR MATEMÁTICO', { requestId });
    
    const score = quant.score || 0;
    const rsi = quant.rsi || 50;
    const tendencia = contexto?.tendencia_macro || quant.tendencia || 'LATERAL';
    
    // 🔥 ENTRADA COMPLETA DO MOTOR
    const indicadores = {
        tendencia,
        rsi,
        macd: quant.macd || 0,
        vwap_status: quant.vwap_status || 'lateral',
        volume_status: quant.volume_status || 'neutro',
        suporte_status: quant.suporte_status || 'neutro',
        resistencia_status: quant.resistencia_status || 'neutro'
    };
    
    // 🔥 USANDO O MOTOR PARA CALCULAR A DECISÃO
    const scoreFinal = motor.calcularScore(indicadores);
    const confianca = motor.calcularConfidence(scoreFinal);
    const qualidade = motor.calcularQualidade(scoreFinal, confianca, true);
    const direcao = motor.calcularDirecao(scoreFinal);
    const justificativa = motor.calcularJustificativa(scoreFinal, direcao);
    
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
    
    // 🔥 SE NÃO HÁ OPORTUNIDADE CLARA, RETORNA AGUARDAR COM JUSTIFICATIVA
    if (direcao === 'AGUARDAR') {
        return {
            direcao: 'AGUARDAR',
            confianca: confianca,
            qualidade: qualidade,
            timing: 'AGUARDAR',
            justificativa: justificativa, // ✅ JUSTIFICATIVA DO MOTOR
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
        justificativa: justificativa,
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