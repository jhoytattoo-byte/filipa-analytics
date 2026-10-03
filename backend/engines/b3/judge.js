// ============================================================
// B3 JUDGE — v23.0 (Motor Matemático + SuperTrend Triplo + Claude Fallback)
// ============================================================
const logger = require('../../utils/logger');
const motor = require('../motor');
const anthropicService = require('../../services/anthropic');  // 🔥 NOVO

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
    
    // 🔥 FORÇA DIREÇÃO (nunca NEUTRO)
    let direcao = motor.calcularDirecao(scoreFinal);
    if (direcao === 'NEUTRO' || !direcao) {
        if (scoreFinal > 0) {
            direcao = 'COMPRA';
        } else if (scoreFinal < 0) {
            direcao = 'VENDA';
        } else {
            direcao = (tendencia === 'ALTA') ? 'COMPRA' : 'VENDA';
            logger.info(`[B3 Judge] ℹ️ Score 0 — usando tendência ${tendencia} → ${direcao}`, { requestId });
        }
    }
    
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
            risco_principal: 'Dados divergentes.',
            estrategia: { preco_atual: null, stop_loss: null, alvo1: null, entrada: 'BLOQUEADO', points_mode: false }
        };
    }

    // ============================================================
    // 🔥 FASE 5: CLAUDE como fallback do Juiz
    // ============================================================
    // Só chama IA quando o motor matemático está em dúvida:
    // - Score = 0 (empate técnico)
    // - OU confiança < 70% (sinal fraco)
    // ============================================================
    const precisaIA = (scoreFinal === 0) || (confianca < 70);
    
    if (precisaIA) {
        try {
                       const promptJuiz = `Você é a Filipa, juíza de trading.

Analise os dados abaixo e SEMPRE indique COMPRA ou VENDA (nunca AGUARDAR ou NEUTRO).

DADOS:
- Ativo: ${ativo}
- Score Quant: ${scoreFinal} (escala: -3 a +3)
- RSI: ${rsi}
- Tendência macro: ${tendencia}
- Preço atual: ${visao.preco_atual}
- Confiança do motor: ${confianca}%
- Qualidade: ${qualidade}

REGRAS CRÍTICAS:
1. NUNCA use "AGUARDAR" ou "NEUTRO" — o trader decide se opera
2. Se o sinal for fraco, indique a direção MAS com qualidade baixa (C ou D) e aviso
3. Score positivo OU tendência de alta → COMPRA
4. Score negativo OU tendência de baixa → VENDA
5. Se estiver em dúvida, escolha a direção da tendência macro

REGRAS DE VOCABULÁRIO OBRIGATÓRIAS:
- RSI > 70 → chamar de "sobreCOMPRA" (mercado subiu demais)
- RSI < 30 → chamar de "sobreVENDA" (mercado caiu demais)
- NUNCA troque os termos — o trader vai notar

Responda APENAS este JSON:
{
  "direcao": "COMPRA | VENDA",
  "confianca": 50-90,
  "qualidade": "A | B | C | D",
  "justificativa": "explicação curta em português",
  "risco_principal": "risco principal ou 'Riscos não identificados'",
  "aviso": "aviso curto se qualidade for C ou D (opcional)"
}`;
            
            const respostaIA = await anthropicService.complete(promptJuiz, {
                maxTokens: 500,
                temperature: 0.2
            });
            
            // Parse robusto do JSON
            let textoLimpo = (respostaIA || '').trim();
            const jsonMatch = textoLimpo.match(/{[\s\S]*}/);
            if (jsonMatch) textoLimpo = jsonMatch[0];
            
            const parsedIA = JSON.parse(textoLimpo);
            
            logger.info(`[B3 Judge] 🤖 Claude validou: ${parsedIA.direcao} ${parsedIA.confianca}%`, { requestId });
            
            // Se Claude disse COMPRA ou VENDA, usa a decisão dele
            if (parsedIA.direcao && parsedIA.direcao !== 'AGUARDAR') {
                const direcaoIA = parsedIA.direcao;
                const confiancaIA = parseInt(parsedIA.confianca) || confianca;
                const qualidadeIA = parsedIA.qualidade || qualidade;
                
                // Formata preço por tipo de ativo
                const precoIA = formatarPrecoPorAtivo(parseFloat(visao.preco_atual) || 0, ativo);
                
                // Recalcula SL/TP com base na decisão do Claude
                const stopLossIA = motor.calcularStopLoss(precoIA, direcaoIA, ativo, null, config);
                const takeProfitIA = motor.calcularTakeProfit(precoIA, direcaoIA, stopLossIA, ativo);
                
                logger.info(`[B3 Judge] ✅ Decisão FINAL (Claude): ${direcaoIA} ${confiancaIA}%`, { requestId });
                
                               return {
                    direcao: direcaoIA,
                    confianca: confiancaIA,
                    qualidade: qualidadeIA,
                    timing: confiancaIA >= 80 ? 'AGORA' : 'PROXIMA_VELA',
                    justificativa: `🤖 Claude: ${parsedIA.justificativa}`,
                    risco_principal: parsedIA.risco_principal || 'Riscos não identificados',
                    aviso: parsedIA.aviso || '',   // 🔥 NOVO
                    estrategia: {
                        preco_atual: precoIA,
                        stop_loss: stopLossIA,
                        alvo1: takeProfitIA,
                        entrada: 'AGORA',
                        points_mode: false
                    },
                    fonte_decisao: 'claude_fallback'
                };
            }
            
                       // 🔥 Se Claude retornou algo inesperado (AGUARDAR/NEUTRO), força direção
            if (parsedIA.direcao === 'AGUARDAR' || parsedIA.direcao === 'NEUTRO' || !parsedIA.direcao) {
                logger.warn(`[B3 Judge] ⚠️ Claude retornou "${parsedIA.direcao}" — forçando direção pelo motor local`, { requestId });
                
                // Determina direção forçada: score > 0 → COMPRA; score < 0 → VENDA; score = 0 → tendência
                let direcaoForcada;
                if (scoreFinal > 0) direcaoForcada = 'COMPRA';
                else if (scoreFinal < 0) direcaoForcada = 'VENDA';
                else {
                    direcaoForcada = (tendencia === 'ALTA') ? 'COMPRA' : 'VENDA';
                }
                
                const precoForcado = formatarPrecoPorAtivo(parseFloat(visao.preco_atual) || 0, ativo);
                const stopLossForcado = motor.calcularStopLoss(precoForcado, direcaoForcada, ativo, null, config);
                const takeProfitForcado = motor.calcularTakeProfit(precoForcado, direcaoForcada, stopLossForcado, ativo);
                
                              return {
                    direcao: direcaoForcada,
                    confianca: parseInt(parsedIA.confianca) || confianca,
                    qualidade: parsedIA.qualidade || qualidade || 'D',
                    timing: 'PROXIMA_VELA',
                    justificativa: `⚠️ ${parsedIA.justificativa || 'Sinal fraco'} (motor local: ${direcaoForcada})`,
                    risco_principal: parsedIA.risco_principal || 'Riscos não identificados',
                    aviso: parsedIA.aviso || '',   // 🔥 NOVO
                    estrategia: {
                        preco_atual: precoForcado,
                        stop_loss: stopLossForcado,
                        alvo1: takeProfitForcado,
                        entrada: 'AGORA',
                        points_mode: false
                    },
                    fonte_decisao: 'claude_fallback_forcado'
                };
            }
            
        } catch (e) {
            // Se Claude falhar, mantém a decisão do motor matemático
            logger.warn(`[B3 Judge] ⚠️ Claude falhou, usando motor local: ${e.message}`, { requestId });
        }
    } else {
        logger.info(`[B3 Judge] ℹ️ Motor local OK (score=${scoreFinal}, conf=${confianca}%) — Claude não necessário`, { requestId });
    }
    
    // ============================================================
    // 🔧 Formatação do preço por tipo de ativo (fallback: motor local)
    // ============================================================
    let preco = parseFloat(visao.preco_atual) || 0;
    preco = formatarPrecoPorAtivo(preco, ativo);
    
    // Se o preço formatado for 0, tenta usar o preço real do contexto
    if (preco === 0 && contexto?.preco_real && contexto.preco_real > 0) {
        preco = contexto.preco_real;
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
    const ativoUpper = (ativo || '').toUpperCase();
    const isB3 = ativoUpper.includes('WIN') || ativoUpper.includes('WDO') || 
                 ativoUpper.includes('BIT') || ativoUpper.includes('ETH') || 
                 ativoUpper.includes('SOL') || ativoUpper.includes('GLD') ||
                 ativoUpper.includes('PETR') || ativoUpper.includes('VALE') || 
                 ativoUpper.includes('ITUB');
    const pointsMode = isB3;
    
       return {
        direcao,
        confianca,
        qualidade,
        timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
        justificativa: justificativaFinal,
        risco_principal: riscos,
        aviso: '',   // 🔥 NOVO (motor local não gera aviso)
        estrategia: {
            preco_atual: preco,
            stop_loss: stopLoss,
            alvo1: takeProfit,
            entrada: 'AGORA',
            points_mode: pointsMode
        },
        fonte_decisao: 'motor_local'
    };
}

// ============================================================
// HELPER: Formata o preço de acordo com o tipo de ativo
// ============================================================
function formatarPrecoPorAtivo(preco, ativo) {
    if (!preco || isNaN(preco)) return 0;
    
    const ativoUpper = (ativo || '').toUpperCase();
    
    // Detecta tipo
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
    
    // Formata
    if (isOTC || isForex) {
        // OTC/Forex: mantém decimais
        return motor.formatarPreco(preco, ativo);
    } else if (isCripto || isAcao || isCommodity || isIndice) {
        // Cripto/Ações/Commodities/Índices: mantém decimais
        return motor.formatarPreco(preco, ativo);
    } else {
        // B3 (WIN, WDO, PETR, etc): arredonda pra inteiro
        return motor.formatarPreco(preco, ativo);
    }
}

module.exports = { execute };