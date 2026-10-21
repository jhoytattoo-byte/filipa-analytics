// ============================================================
// curatorShared.js — v1.3 (Desbloqueio de Ativos)
// Lógica comum de Curador para todos os mercados
// ============================================================

const logger = require('../utils/logger');
const { getMarketData } = require('./dataService');
const groqService = require('./groq');
const prompts = require('../config/prompts');

/**
 * Tenta deduzir o símbolo da API caso o ativo não esteja no mapa
 */
function deduzirSimboloAPI(ativoOriginal, marketName) {
    if (!ativoOriginal) return null;
    const ativo = ativoOriginal.toUpperCase().replace(/[\s\-]/g, '');

    // 1. Crypto (Ex: GALAUSD -> GALAUSDT)
    if (marketName === 'Crypto') {
        // Remove USD, USDT, BRL do final para evitar duplicação
        const limpo = ativo.replace(/(USD|USDT|BRL)$/, '');
        return limpo + 'USDT';
    }

    // 2. Forex (Ex: EUR/USD -> EURUSD)
    if (marketName === 'Forex') {
        const limpo = ativo.replace(/\//g, '');
        // Se tiver 6 letras, é um par válido (ex: EURUSD)
        if (limpo.length === 6) return limpo;
        return null;
    }

    // 3. B3 Ações (Ex: LREN3, MGLU3)
    if (marketName === 'B3') {
        // Se termina com número (ex: 3, 4, 11), provavelmente é ação/FII válido na Brapi
        if (/\d+$/.test(ativo) && ativo.length <= 6) return ativo;
        return null; // Futuros (WINV26) já estão mapeados, se não estão, não deduzimos.
    }

    // 4. Stocks (Ex: PLTR)
    if (marketName === 'Stocks') {
        return ativo;
    }

    // Fallback genérico para outros mercados
    return null;
}

async function execute({
    visionData,
    requestId,
    config,
    marketName,
    getSymbolFn,
    getSessionFn,
    validateDivergence = false,
    divergenceThreshold = 50,
}) {
    logger.info(`[${marketName} Curator] Iniciando contexto`, { requestId });

    // 1. Detecta sessão
    const sessao = getSessionFn ? getSessionFn() : 'Sessão padrão';

    // 2. Mapeia símbolo da API (Tenta mapa curado primeiro)
    const symbolInfo = getSymbolFn ? getSymbolFn(visionData.ativo) : null;
    let simboloAPI = symbolInfo ? symbolInfo.api : null;
    
    // 🚀 DESBLOQUEIO: Se não achou no mapa, tenta deduzir
    if (!simboloAPI) {
        simboloAPI = deduzirSimboloAPI(visionData.ativo, marketName);
        if (simboloAPI) {
            logger.info(`[${marketName} Curator] 🔍 Ativo não mapeado. Deduzido: ${simboloAPI}`, { requestId });
        }
    }

    // 3. Busca dados reais
    let dadosReais = null;
    let ancoragemValida = true;
    let tendenciaMacro = 'LATERAL';

    if (simboloAPI) {
        logger.info(`[${marketName} Curator] Símbolo API: ${simboloAPI}`, { requestId });
        dadosReais = await getMarketData(visionData.ativo, simboloAPI);

        if (dadosReais) {
            tendenciaMacro = dadosReais.tendencia_macro || 'LATERAL';

            if (validateDivergence) {
                const precoVision = parseFloat(visionData.preco_atual);
                if (precoVision && dadosReais.preco_real) {
                    const divergenciaPercent = Math.abs((precoVision - dadosReais.preco_real) / dadosReais.preco_real) * 100;
                    
                    if (divergenciaPercent > divergenceThreshold) {
                        ancoragemValida = false;
                        logger.warn(`[${marketName} Curator] ⚠️ Divergência de ${divergenciaPercent.toFixed(2)}% (${precoVision} vs ${dadosReais.preco_real})`, { requestId });
                    }
                }
            }
        } else {
            logger.warn(`[${marketName} Curator] ⚠️ Dedução (${simboloAPI}) falhou na API.`, { requestId });
        }
    } else {
        logger.warn(`[${marketName} Curator] ⚠️ Ativo não mapeado e sem dedução: ${visionData.ativo}`, { requestId });
    }

    // 4. Chama IA (DeepSeek principal via groqService.text)
    let contextoIA = '';
    try {
        const promptDinamico = `${prompts.curador}

DADOS ATUAIS DO MERCADO:
- Ativo: ${visionData.ativo || 'N/A'}
- Timeframe: ${visionData.timeframe || 'N/A'}
- Preço atual: ${visionData.preco_atual || 'N/A'}
- RSI: ${visionData.rsi || 'N/A'}
- Tendência visual: ${visionData.tendencia || 'N/A'}
- Dados reais de mercado: ${dadosReais ? `preço real = ${dadosReais.preco_real}, tendência = ${dadosReais.tendencia_macro}` : 'indisponível (Ativo não mapeado na API)'}

Responda APENAS o JSON. Sem markdown, sem explicações.`;

        const resposta = await groqService.text(promptDinamico);
        
        let textoLimpo = (resposta || '').trim();
        const jsonMatch = textoLimpo.match(/{[\s\S]*}/);
        if (jsonMatch) textoLimpo = jsonMatch[0];

        const parsed = JSON.parse(textoLimpo);
        contextoIA = parsed.opiniao || '';

        if (!contextoIA) {
            logger.warn(`[${marketName} Curator] ⚠️ Modelo retornou JSON sem campo "opiniao".`, { requestId });
        } else {
            logger.info(`[${marketName} Curator] ✅ IA gerou contexto.`, { requestId });
        }
    } catch (e) {
        logger.warn(`[${marketName} Curator] ⚠️ IA falhou: ${e.message}`, { requestId });
        contextoIA = '';
    }

    return {
        regime: tendenciaMacro,
        volatilidade: dadosReais?.volatilidade || 'NORMAL',
        sessao: sessao,
        noticias: dadosReais ? 'Dados reais obtidos' : 'Sem dados reais',
        source: dadosReais ? dadosReais.fonte : 'local_default',
        market_hours: symbolInfo?.marketHours || 'Sessão padrão',
        dados_reais: dadosReais,
        ancoragem_valida: ancoragemValida,
        tendencia_macro: tendenciaMacro,
        preco_real: dadosReais ? dadosReais.preco_real : null,
        opiniao_ia: contextoIA,
    };
}

module.exports = { execute };