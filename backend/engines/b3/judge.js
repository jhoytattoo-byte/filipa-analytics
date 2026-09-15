// ============================================================
// B3 JUDGE — v21.0 (Motor Matemático + SuperTrend Triplo)
// ============================================================
const logger = require('../../utils/logger');
const motor = require('../motor');

async function execute(data, requestId, config) {
    const { visao, quant, contexto } = data;
    logger.info('[B3 Judge] Decisão usando MOTOR MATEMÁTICO + SuperTrend Triplo', { requestId });
    
    // ✅ USANDO O SCORE ÚNICO DO QUANT (NÃO RECALCULA!)
    const scoreFinal = quant.score || 0;
    const rsi = quant.rsi || 50;
    const tendencia = contexto?.tendencia_macro || quant.tendencia || 'LATERAL';
    
    // ✅ CAPTURA OS 3 SUPERTRENDS
    const supertrendCurto = quant.supertrend_curto || visao.supertrend_curto || null;
    const supertrendMedio = quant.supertrend_medio || visao.supertrend_medio || null;
    const supertrendLongo = quant.supertrend_longo || visao.supertrend_longo || null;
    const supertrendValor = quant.supertrend_valor || visao.supertrend_valor || null;
    
    // ✅ CALCULANDO A DECISÃO COM O SCORE DO QUANT
    const confianca = motor.calcularConfidence(scoreFinal);
    const qualidade = motor.calcularQualidade(scoreFinal, confianca, true);
    const direcao = motor.calcularDirecao(scoreFinal);
    const justificativa = motor.calcularJustificativa(scoreFinal, direcao);
    const riscos = motor.calcularRiscos(scoreFinal, direcao, {
        rsi,
        tendencia,
        supertrend_curto: supertrendCurto,
        supertrend_medio: supertrendMedio,
        supertrend_longo: supertrendLongo
    });
    
    // 🔥 RISK GATE (Validação de dados e tendência)
    const ancoragemValida = contexto?.ancoragem_valida !== false;
    
    if (!ancoragemValida) {
        return {
            direcao: 'NEUTRO',
            confianca: 0,
            qualidade: 'D',
            timing: 'BLOQUEADO',
            justificativa: '⚠️ Dados reais divergem da imagem. Operação bloqueada.',
            risco_principal: 'Dados divergentes.',
            estrategia: { preco_atual: null, stop_loss: null, alvo1: null, entrada: 'BLOQUEADO', points_mode: false }
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
    
    // ✅ USA O SUPERTREND COMO STOP LOSS (se disponível)
    const stopLoss = motor.calcularStopLoss(preco, direcao, supertrendValor, config);
    const slPoints = Math.abs(preco - stopLoss);
    const tpPoints = slPoints * 2; // R/R 1:2
    
    // ✅ Adiciona o SuperTrend na justificativa
    let justificativaFinal = justificativa;
    if (supertrendCurto && supertrendMedio && supertrendLongo) {
        justificativaFinal += ` SuperTrends: C=${supertrendCurto}, M=${supertrendMedio}, L=${supertrendLongo}.`;
    }
    
    return {
        direcao,
        confianca,
        qualidade,
        timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
        justificativa: justificativaFinal,
        risco_principal: riscos,
        estrategia: {
            preco_atual: preco,
            stop_loss: stopLoss,
            alvo1: direcao === 'VENDA' ? preco - tpPoints : preco + tpPoints,
            entrada: 'AGORA',
            points_mode: true
        }
    };
}

module.exports = { execute };