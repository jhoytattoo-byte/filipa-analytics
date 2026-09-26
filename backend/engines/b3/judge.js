// ============================================================
// B3 JUDGE — v22.0 (Motor Matemático + SuperTrend Triplo + Multi-Mercado)
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
    const ativo = visao.ativo || quant.ativo || 'N/A';
    
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
    
    // ============================================================
    // 🔧 CORREÇÃO CRÍTICA: Formatação do preço por tipo de ativo
    // ============================================================
    let preco = parseFloat(visao.preco_atual) || 0;
    const ativoUpper = (ativo || '').toUpperCase();
    
    // Detecta o tipo de ativo
    const isOTC = ativoUpper.includes('OTC') || ativoUpper.includes('BINÁRIAS');
    const isForex = ativoUpper.includes('USD') || ativoUpper.includes('EUR') || 
                    ativoUpper.includes('GBP') || ativoUpper.includes('JPY') || 
                    ativoUpper.includes('CHF') || ativoUpper.includes('AUD') || 
                    ativoUpper.includes('CAD') || ativoUpper.includes('NZD');
    const isCripto = ativoUpper.includes('BTC') || ativoUpper.includes('ETH') || 
                     ativoUpper.includes('SOL') || ativoUpper.includes('BNB') || 
                     ativoUpper.includes('XRP') || ativoUpper.includes('DOGE');
    const isAcao = ativoUpper.includes('AAPL') || ativoUpper.includes('TSLA') || 
                   ativoUpper.includes('NVDA') || ativoUpper.includes('MSFT') || 
                   ativoUpper.includes('AMZN') || ativoUpper.includes('GOOGL') || 
                   ativoUpper.includes('META') || ativoUpper.includes('APLD') || 
                   ativoUpper.includes('IREN') || ativoUpper.includes('MARA') || 
                   ativoUpper.includes('BNGO');
    const isCommodity = ativoUpper.includes('XAU') || ativoUpper.includes('WTI') || 
                        ativoUpper.includes('XAG') || ativoUpper.includes('COBRE') || 
                        ativoUpper.includes('CAFÉ') || ativoUpper.includes('SOJA');
    const isIndice = ativoUpper.includes('IBOV') || ativoUpper.includes('S&P') || 
                     ativoUpper.includes('NASDAQ') || ativoUpper.includes('DOW') || 
                     ativoUpper.includes('DAX') || ativoUpper.includes('FTSE') || 
                     ativoUpper.includes('NIKKEI') || ativoUpper.includes('HANG');
    const isB3 = ativoUpper.includes('WIN') || ativoUpper.includes('WDO') || 
                 ativoUpper.includes('BIT') || ativoUpper.includes('ETH') || 
                 ativoUpper.includes('SOL') || ativoUpper.includes('GLD') ||
                 ativoUpper.includes('PETR') || ativoUpper.includes('VALE') || 
                 ativoUpper.includes('ITUB');
    
    // ✅ Aplica a formatação correta
    if (isOTC || isForex) {
        // OTC/Forex: mantém 6 casas decimais (ex: 1.132645)
        preco = motor.formatarPreco(preco, ativo);
        logger.info('[B3 Judge] Preço formatado (OTC/Forex):', preco);
    } else if (isCripto || isAcao || isCommodity || isIndice) {
        // Cripto/Ações/Commodities/Índices: 2 casas decimais (ex: 84000.00)
        preco = motor.formatarPreco(preco, ativo);
        logger.info('[B3 Judge] Preço formatado (Cripto/Ações/Commodities):', preco);
    } else if (isB3) {
        // B3: arredonda para inteiro (ex: 187000)
        preco = motor.formatarPreco(preco, ativo);
        logger.info('[B3 Judge] Preço formatado (B3):', preco);
    } else {
        // Fallback: usa o preço real se disponível
        if (contexto?.preco_real && contexto.preco_real > 0) {
            preco = contexto.preco_real;
        }
    }
    
    // ✅ USA O SUPERTREND COMO STOP LOSS (se disponível)
    const stopLoss = motor.calcularStopLoss(preco, direcao, ativo, supertrendValor, config);
    const takeProfit = motor.calcularTakeProfit(preco, direcao, stopLoss, ativo);
    
    // ✅ Adiciona o SuperTrend na justificativa
    let justificativaFinal = justificativa;
    if (supertrendCurto && supertrendMedio && supertrendLongo) {
        justificativaFinal += ` SuperTrends: C=${supertrendCurto}, M=${supertrendMedio}, L=${supertrendLongo}.`;
    }
    
    // ✅ Define o modo de pontos (B3 usa pontos, outros usam preço)
    const pointsMode = isB3;
    
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
            alvo1: takeProfit,
            entrada: 'AGORA',
            points_mode: pointsMode
        }
    };
}

module.exports = { execute };