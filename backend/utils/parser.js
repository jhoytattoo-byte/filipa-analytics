// ============================================================
// UTILS — PARSER
// ============================================================

const logger = require('./logger');

function extrairJSON(texto) {
    if (!texto || typeof texto !== 'string') {
        throw new Error('Texto vazio ou invalido');
    }

    // 🔥 REMOVE <think> TAGS
    let limpo = texto
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<think>[\s\S]*/gi, '')
        .trim();

    // Tenta parse direto
    try {
        const parsed = JSON.parse(limpo);
        logger.info('[Parser] JSON puro encontrado');
        return parsed;
    } catch (e) {}

    // Remove markdown
    limpo = limpo
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .replace(/`/g, '');

    // Procura objeto JSON
    const matchObj = limpo.match(/\{[\s\S]*\}/);
    if (matchObj) {
        try {
            return JSON.parse(matchObj[0]);
        } catch (e) {}
    }

    // Procura array JSON
    const matchArr = limpo.match(/\[[\s\S]*\]/);
    if (matchArr) {
        try {
            return JSON.parse(matchArr[0]);
        } catch (e) {}
    }

    // Tenta corrigir
    try {
        const corrigido = limpo
            .replace(/'/g, '"')
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":')
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
        return JSON.parse(corrigido);
    } catch (e) {}

    logger.error(`[Parser] JSON nao encontrado: ${texto.substring(0, 200)}`);
    throw new Error('JSON nao encontrado');
}

function mapearParaFilipa(dados) {
    if (!dados || typeof dados !== 'object') {
        throw new Error('Dados invalidos');
    }

    const resultado = {
        ativo: dados.ativo || dados.symbol || dados.par || 'EUR/USD',
        timeframe: dados.timeframe || dados.periodo || dados.tf || 'M5',
        tendencia: dados.tendencia || dados.trend || 'lateral',
        suporte: parseFloat(dados.suporte || dados.support || 0),
        resistencia: parseFloat(dados.resistencia || dados.resistance || 0),
        preco_atual: parseFloat(dados.preco_atual || dados.preco || dados.price || 0),
        rsi: parseFloat(dados.rsi || dados.RSI || 50),
        padrao_candle: dados.padrao_candle || dados.padrao || dados.pattern || 'nenhum',
        noticias: dados.noticias || dados.news || 'Nenhuma',
        candles: Array.isArray(dados.candles) ? dados.candles.map(c => ({
            abertura: parseFloat(c.abertura || c.open || 0),
            maxima: parseFloat(c.maxima || c.high || 0),
            minima: parseFloat(c.minima || c.low || 0),
            fechamento: parseFloat(c.fechamento || c.close || 0)
        })) : []
    };

    logger.info(`[Parser] Mapeado — ${resultado.ativo}, Candles: ${resultado.candles.length}`);
    return resultado;
}

module.exports = { extrairJSON, mapearParaFilipa };