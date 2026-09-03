const logger = require('../../utils/logger');

async function execute(data, requestId, config) {
    const { visao, quant, contexto } = data;
    logger.info('[B3 Judge] Decisão com cálculo em PONTOS + RISK GATE', { requestId });
    
    const score = quant.score || 0;
    const rsi = quant.rsi || 50;
    const confianca = quant.confidence || 70;
    
    let direcao = 'NEUTRO';
    let qualidade = 'C';
    
    // 🔥 RISK GATE: Validação de Dados Reais
    const ancoragemValida = contexto?.ancoragem_valida !== false;
    const tendenciaMacro = contexto?.tendencia_macro || 'LATERAL';
    
    // 🔴 1. SE DADOS REAIS INVÁLIDOS = BLOQUEADO
    if (!ancoragemValida) {
        return {
            direcao: 'NEUTRO',
            confianca: 0,
            qualidade: 'D',
            timing: 'BLOQUEADO',
            justificativa: '⚠️ Dados reais divergem da imagem. Operação bloqueada.',
            estrategia: {
                preco_atual: null,
                stop_loss: null,
                alvo1: null,
                entrada: 'BLOQUEADO',
                points_mode: false
            }
        };
    }

    // 🔴 2. TENDÊNCIA CONTRA A DIREÇÃO = BLOQUEADO
    if (tendenciaMacro === 'ALTA' && direcao === 'VENDA') {
        return {
            direcao: 'VENDA',
            confianca: confianca - 20,
            qualidade: 'C',
            timing: 'BLOQUEADO',
            justificativa: `⚠️ Venda contra tendência macro (${tendenciaMacro}). Operação bloqueada.`,
            estrategia: {
                preco_atual: null,
                stop_loss: null,
                alvo1: null,
                entrada: 'BLOQUEADO',
                points_mode: false
            }
        };
    }
    if (tendenciaMacro === 'BAIXA' && direcao === 'COMPRA') {
        return {
            direcao: 'COMPRA',
            confianca: confianca - 20,
            qualidade: 'C',
            timing: 'BLOQUEADO',
            justificativa: `⚠️ Compra contra tendência macro (${tendenciaMacro}). Operação bloqueada.`,
            estrategia: {
                preco_atual: null,
                stop_loss: null,
                alvo1: null,
                entrada: 'BLOQUEADO',
                points_mode: false
            }
        };
    }

    // 🔴 3. SE SCORE NÃO ALINHADO COM A DIREÇÃO = BLOQUEADO
    if (direcao === 'COMPRA' && score < 2) {
        return {
            direcao: 'COMPRA',
            confianca: confianca - 20,
            qualidade: 'C',
            timing: 'BLOQUEADO',
            justificativa: '⚠️ Score positivo insuficiente para compra. Operação bloqueada.',
            estrategia: {
                preco_atual: null,
                stop_loss: null,
                alvo1: null,
                entrada: 'BLOQUEADO',
                points_mode: false
            }
        };
    }
    if (direcao === 'VENDA' && score > -2) {
        return {
            direcao: 'VENDA',
            confianca: confianca - 20,
            qualidade: 'C',
            timing: 'BLOQUEADO',
            justificativa: '⚠️ Score negativo insuficiente para venda. Operação bloqueada.',
            estrategia: {
                preco_atual: null,
                stop_loss: null,
                alvo1: null,
                entrada: 'BLOQUEADO',
                points_mode: false
            }
        };
    }

    // ✅ 4. SE TUDO PASSOU = OPERAÇÃO LIBERADA
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
    
    // ✅ Usa o preço real validado se existir
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
        justificativa: `B3: RSI ${rsi}, Score ${score}, Tendência ${tendenciaMacro}. SL ${slPoints}pts, TP ${tpPoints}pts.`,
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