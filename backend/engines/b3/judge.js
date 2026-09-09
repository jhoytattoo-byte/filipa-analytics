const logger = require('../../utils/logger');
const groqService = require('../../services/groq');
const prompts = require('../../config/prompts');

async function execute(data, requestId, config) {
    const { visao, quant, contexto } = data;
    logger.info('[B3 Judge] Decisão com IA (Claude/Groq) + RISK GATE', { requestId });
    
    const score = quant.score || 0;
    const rsi = quant.rsi || 50;
    const confianca = quant.confidence || 70;
    
    let direcao = 'NEUTRO';
    let qualidade = 'C';
    
    const ancoragemValida = contexto?.ancoragem_valida !== false;
    const tendenciaMacro = contexto?.tendencia_macro || 'LATERAL';
    
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

    if (score >= 2 && rsi < 40) { direcao = 'COMPRA'; qualidade = 'A'; }
    else if (score <= -2 && rsi > 60) { direcao = 'VENDA'; qualidade = 'A'; }
    else if (score > 0) { direcao = 'COMPRA'; qualidade = 'B'; }
    else if (score < 0) { direcao = 'VENDA'; qualidade = 'B'; }
    
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
    
    let justificativaIA = '';
    try {
        const promptJuiz = prompts.juiz.replace('{RSI}', rsi).replace('{SCORE}', score).replace('{TENDENCIA}', tendenciaMacro);
        const resposta = await groqService.text(promptJuiz, 'qwen/qwen3.6-27b');
        const parsed = JSON.parse(resposta);
        justificativaIA = parsed.justificativa || `B3: RSI ${rsi}, Score ${score}, Tendência ${tendenciaMacro}.`;
    } catch (e) {
        justificativaIA = `B3: RSI ${rsi}, Score ${score}, Tendência ${tendenciaMacro}.`;
    }
    
    return {
        direcao,
        confianca,
        qualidade,
        timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
        justificativa: justificativaIA,
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