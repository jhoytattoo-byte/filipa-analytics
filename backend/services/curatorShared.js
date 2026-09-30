// ============================================================
// curatorShared.js — v1.1
// Lógica comum de Curador para todos os mercados
// ============================================================
// Cada engine (B3, Forex, OTC, etc.) chama esta função passando
// sua configuração específica (sessão, símbolos, tipo de ativo).
//
// Regra de ouro: GRÁTIS PRIMEIRO, PAGO COMO FALLBACK.
// ============================================================

const logger = require('../utils/logger');
const { getMarketData } = require('./dataService');
const groqService = require('./groq');
const prompts = require('../config/prompts');

/**
 * Executa o Curador genérico.
 *
 * @param {Object} opts
 * @param {Object} opts.visionData - Dados extraídos pela Vision
 * @param {string} opts.requestId - ID da requisição
 * @param {Object} opts.config - Config global
 * @param {string} opts.marketName - Nome do mercado (ex: 'Forex')
 * @param {Function} opts.getSymbolFn - Função ativo → símbolo API
 * @param {Function} opts.getSessionFn - Função que retorna sessão atual
 * @param {boolean} [opts.validateDivergence=false] - Se valida divergência
 * @param {number} [opts.divergenceThreshold=50] - Threshold de divergência
 */
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

    // 2. Mapeia símbolo da API
    const symbolInfo = getSymbolFn ? getSymbolFn(visionData.ativo) : null;
    const simboloAPI = symbolInfo ? symbolInfo.api : '';

    // 3. Busca dados reais
    let dadosReais = null;
    let ancoragemValida = true;
    let tendenciaMacro = 'LATERAL';

    if (simboloAPI) {
        logger.info(`[${marketName} Curator] Símbolo API: ${simboloAPI} (${symbolInfo.nome || 'N/A'})`, { requestId });
        dadosReais = await getMarketData(visionData.ativo, simboloAPI);

        if (dadosReais) {
            tendenciaMacro = dadosReais.tendencia_macro || 'LATERAL';

            if (validateDivergence) {
                const precoVision = parseFloat(visionData.preco_atual);
                if (precoVision && dadosReais.preco_real) {
                    const divergencia = Math.abs(precoVision - dadosReais.preco_real);
                    if (divergencia > divergenceThreshold) {
                        ancoragemValida = false;
                        logger.warn(`[${marketName} Curator] ⚠️ Divergência de ${divergencia.toFixed(2)} detectada!`, { requestId });
                    }
                }
            } else {
                logger.info(`[${marketName} Curator] ℹ️ Validação cruzada desativada para este mercado`, { requestId });
            }
        }
    } else {
        logger.warn(`[${marketName} Curator] Ativo não mapeado: ${visionData.ativo}`, { requestId });
    }

    // 4. Chama IA (Groq grátis) com contexto básico
    let contextoIA = '';
    try {
        // 🔥 Monta prompt dinâmico com contexto
        const promptDinamico = `${prompts.curador}

DADOS ATUAIS DO MERCADO:
- Ativo: ${visionData.ativo || 'N/A'}
- Timeframe: ${visionData.timeframe || 'N/A'}
- Preço atual: ${visionData.preco_atual || 'N/A'}
- RSI: ${visionData.rsi || 'N/A'}
- Tendência visual: ${visionData.tendencia || 'N/A'}
- Dados reais de mercado: ${dadosReais ? `preço real = ${dadosReais.preco_real}, tendência = ${dadosReais.tendencia_macro}` : 'indisponível'}

Responda APENAS o JSON. Sem markdown, sem explicações.`;

        const resposta = await groqService.text(promptDinamico, 'qwen/qwen3.8-27b');

        // Parse robusto (aceita markdown ```json ... ```)
        let textoLimpo = (resposta || '').trim();
        const jsonMatch = textoLimpo.match(/{[\s\S]*}/);
        if (jsonMatch) textoLimpo = jsonMatch[0];

        const parsed = JSON.parse(textoLimpo);
        contextoIA = parsed.opiniao || '';
    } catch (e) {
        logger.warn(`[${marketName} Curator] ⚠️ IA falhou: ${e.message}`, { requestId });
        contextoIA = '';
    }

    // 5. Retorna contexto consolidado
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