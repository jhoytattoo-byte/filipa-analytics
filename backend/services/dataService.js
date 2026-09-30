// ============================================================
// DATA SERVICE — v2.0 (Multi-fonte: Brapi + TwelveData + Binance + Polygon)
// ============================================================
// Roteamento:
//   1. Se o símbolo for B3 (^BVSP, PETR4, VALE3, etc.) → Brapi primeiro
//   2. Senão → TwelveData → Binance → Polygon
// ============================================================

const config = require('../config/env');
const logger = require('../utils/logger');

// ============================================================
// DETECÇÃO: É ativo B3?
// ============================================================
function isB3Symbol(symbol, ativo) {
    const s = (symbol || '').toUpperCase();
    const a = (ativo || '').toUpperCase();

    // Índice Bovespa
    if (s.startsWith('^')) return true;

    // Ações B3 (sigla + número)
    const acoesB3 = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'BBDC4', 'ABEV3', 'B3SA3', 'WEGE3', 'MGLU3'];
    if (acoesB3.includes(s)) return true;
    if (acoesB3.includes(a)) return true;

    return false;
}

// ============================================================
// BRAPI — Ações B3 + Índices
// ============================================================
async function getBrapiData(symbol) {
    const token = config.brapi?.token;
    if (!token) {
        logger.warn('[DataService] BRAPI_TOKEN não configurado');
        return null;
    }

    try {
        const url = `${config.brapi.baseUrl}/quote/${encodeURIComponent(symbol)}?token=${token}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data.results && data.results[0]) {
            const r = data.results[0];
            const preco = parseFloat(r.regularMarketPrice);
            const precoAnterior = preco - parseFloat(r.regularMarketChange || 0);

            logger.info(`[DataService] ✅ Brapi: ${symbol} = ${preco}`);
            return {
                preco_real: preco,
                variacao_percentual: parseFloat(r.regularMarketChangePercent || 0),
                volume: parseFloat(r.regularMarketVolume || 0),
                maxima_dia: parseFloat(r.regularMarketDayHigh || preco),
                minima_dia: parseFloat(r.regularMarketDayLow || preco),
                tendencia_macro: preco > precoAnterior ? 'ALTA' : 'BAIXA',
                fonte: 'Brapi'
            };
        }

        logger.warn(`[DataService] ⚠️ Brapi sem resultado para ${symbol}`);
        return null;
    } catch (e) {
        logger.warn(`[DataService] ⚠️ Brapi falhou para ${symbol}: ${e.message}`);
        return null;
    }
}

// ============================================================
// TWELVEDATA — Forex, Cripto, EUA
// ============================================================
async function getTwelveData(symbol) {
    try {
        const url = `${config.twelvedata.baseUrl}/quote?symbol=${symbol}&apikey=${config.twelvedata.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data && data.close) {
            logger.info(`[DataService] ✅ TwelveData: ${symbol} = ${data.close}`);
            return {
                preco_real: parseFloat(data.close),
                variacao_percentual: parseFloat(data.percent_change || 0),
                volume: parseFloat(data.volume || 0),
                maxima_dia: parseFloat(data.high || data.close),
                minima_dia: parseFloat(data.low || data.close),
                tendencia_macro: parseFloat(data.close) > parseFloat(data.previous_close) ? 'ALTA' : 'BAIXA',
                fonte: 'TwelveData'
            };
        }

        if (data && data.code) {
            logger.warn(`[DataService] ⚠️ TwelveData erro: ${data.code} — ${data.message}`);
        }
        return null;
    } catch (e) {
        logger.warn(`[DataService] ⚠️ TwelveData falhou para ${symbol}: ${e.message}`);
        return null;
    }
}

// ============================================================
// BINANCE — Cripto
// ============================================================
async function getBinanceData(symbol) {
    try {
        // Binance usa símbolos sem "/" (ex: BTCUSD)
        const binanceSymbol = symbol.replace('/', '');
        const url = `${config.binance.baseUrl}/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data && data.lastPrice) {
            logger.info(`[DataService] ✅ Binance: ${symbol} = ${data.lastPrice}`);
            return {
                preco_real: parseFloat(data.lastPrice),
                variacao_percentual: parseFloat(data.priceChangePercent || 0),
                volume: parseFloat(data.volume || 0),
                maxima_dia: parseFloat(data.highPrice || data.lastPrice),
                minima_dia: parseFloat(data.lowPrice || data.lastPrice),
                tendencia_macro: parseFloat(data.lastPrice) > parseFloat(data.openPrice) ? 'ALTA' : 'BAIXA',
                fonte: 'Binance'
            };
        }
        return null;
    } catch (e) {
        logger.warn(`[DataService] ⚠️ Binance falhou para ${symbol}: ${e.message}`);
        return null;
    }
}

// ============================================================
// POLYGON — Backup EUA
// ============================================================
async function getPolygonData(symbol) {
    try {
        const cleanSymbol = symbol.replace('/', '');
        const url = `${config.polygon.baseUrl}/v1/open-close/${cleanSymbol}/2024-01-01?apiKey=${config.polygon.apiKey}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();

        if (data && data.close) {
            logger.info(`[DataService] ✅ Polygon: ${symbol} = ${data.close}`);
            return {
                preco_real: parseFloat(data.close),
                variacao_percentual: 0,
                volume: parseFloat(data.volume || 0),
                maxima_dia: parseFloat(data.high || data.close),
                minima_dia: parseFloat(data.low || data.close),
                tendencia_macro: 'LATERAL',
                fonte: 'Polygon'
            };
        }
        return null;
    } catch (e) {
        logger.warn(`[DataService] ⚠️ Polygon falhou para ${symbol}: ${e.message}`);
        return null;
    }
}

// ============================================================
// FUNÇÃO PRINCIPAL — Roteamento inteligente
// ============================================================
async function getMarketData(ativo, symbol) {
    // 1. É B3? Vai pra Brapi primeiro
    if (isB3Symbol(symbol, ativo)) {
        const brapiData = await getBrapiData(symbol);
        if (brapiData) return brapiData;
        logger.info(`[DataService] Brapi falhou, tentando TwelveData para ${symbol}`);
    }

    // 2. TwelveData (Forex, Cripto, EUA, ou fallback do B3)
    const twelveData = await getTwelveData(symbol);
    if (twelveData) return twelveData;

    // 3. Binance (cripto fallback)
    const binanceData = await getBinanceData(symbol);
    if (binanceData) return binanceData;

    // 4. Polygon (último recurso)
    const polygonData = await getPolygonData(symbol);
    if (polygonData) return polygonData;

    logger.error(`[DataService] ❌ Todas as fontes falharam para ${symbol}`);
    return null;
}

module.exports = { getMarketData };