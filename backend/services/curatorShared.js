// ============================================================
// curatorShared.js — v1.4 (Desbloqueio de Ativos + CME)
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
    // Limpa espaços, hifens e converte para maiúsculo
    const ativo = ativoOriginal.toUpperCase().replace(/[\s\-]/g, '');

    // 1. Crypto
    if (marketName === 'Crypto') {
        const limpo = ativo.replace(/(USD|USDT|BRL)$/, '');
        return limpo + 'USDT';
    }

    // 2. Forex
    if (marketName === 'Forex') {
        const limpo = ativo.replace(/\//g, '');
        if (limpo.length === 6) return limpo;
        return null;
    }

    // 3. B3
    if (marketName === 'B3') {
        if (/\d+$/.test(ativo) && ativo.length <= 6) return ativo;
        return null;
    }

    // 4. Stocks
    if (marketName === 'Stocks') {
        return ativo;
    }

    // 5. Índices / CME
    if (marketName === 'Indices') {
        // Lista de possíveis sufixos de vencimento (Z6, 26, Z26, M6, etc)
        const sufixos = ['Z26', 'M26', 'H26', 'U26', 'Z6', 'M6', 'H6', 'U6', '26'];
        let limpo = ativo;
        
        for (const suf of sufixos) {
            if (limpo.endsWith(suf)) {
                limpo = limpo.slice(0, -suf.length);
                break;
            }
        }

        const mapaCME = {
            'MNQ': '^NDX',   // Micro Nasdaq
            'NQ':  '^NDX',   // E-mini Nasdaq
            'MES': '^GSPC',  // Micro S&P 500
            'ES':  '^GSPC',  // E-mini S&P 500
            'M2K': '^RUT',   // Micro Russell 2000
            'MYM': '^DJI',   // Micro Dow Jones
            'MGC': 'GC=F',   // Micro Ouro
            'GC':  'GC=F',   // Ouro
            'MCL': 'CL=F',   // Micro Petróleo
            'CL':  'CL=F',   // Petróleo WTI
            'XAL': 'AAPL',   // Apple Futuro
            'XMST': 'MSFT',  // Microsoft Futuro
            'XTLS': 'TSLA',  // Tesla Futuro
            'XNVDA': 'NVDA', // Nvidia Futuro
            'XMZN': 'AMZN'   // Amazon Futuro
        };

        if (mapaCME[limpo]) {
            logger.info(`[${marketName} Curator] 🔍 Deduzido CME: ${limpo} -> ${mapaCME[limpo]}`);
            return mapaCME[limpo];
        }
        
        return limpo; 
    }

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

    const sessao = getSessionFn ? getSessionFn() : 'Sessão padrão';

    const symbolInfo = getSymbolFn ? getSymbolFn(visionData.ativo) : null;
    let simboloAPI = symbolInfo ? symbolInfo.api : null;
    
    if (!simboloAPI) {
        simboloAPI = deduzirSimboloAPI(visionData.ativo, marketName);
        if (simboloAPI) {
            logger.info(`[${marketName} Curator] 🔍 Ativo não mapeado. Deduzido: ${simboloAPI}`, { requestId });
        }
    }

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