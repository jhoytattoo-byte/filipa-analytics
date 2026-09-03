// ============================================================
// DATA SERVICE — Validação de Dados Reais de Mercado
// ============================================================
// Prioridade: TwelveData → Binance → Polygon.io
// ============================================================

const config = require('../config/env');
const logger = require('../utils/logger');

async function getMarketData(ativo, symbol) {
    // 1. Tentar TwelveData (Principal)
    try {
        const response = await fetch(`${config.twelvedata.baseUrl}/quote?symbol=${symbol}&apikey=${config.twelvedata.apiKey}`);
        if (!response.ok) throw new Error('TwelveData falhou');
        const data = await response.json();
        
        if (data && data.close) {
            logger.info(`[DataService] ✅ TwelveData: ${symbol} = ${data.close}`);
            return {
                preco_real: parseFloat(data.close),
                variacao_percentual: parseFloat(data.percent_change),
                volume: parseFloat(data.volume),
                maxima_dia: parseFloat(data.high),
                minima_dia: parseFloat(data.low),
                tendencia_macro: parseFloat(data.close) > parseFloat(data.previous_close) ? 'ALTA' : 'BAIXA',
                fonte: 'TwelveData'
            };
        }
    } catch (e) {
        logger.warn(`[DataService] ⚠️ TwelveData falhou para ${symbol}: ${e.message}`);
    }

    // 2. Tentar Binance (Para Cripto)
    try {
        const response = await fetch(`${config.binance.baseUrl}/api/v3/ticker/24hr?symbol=${symbol}`);
        if (!response.ok) throw new Error('Binance falhou');
        const data = await response.json();
        
        if (data && data.lastPrice) {
            logger.info(`[DataService] ✅ Binance: ${symbol} = ${data.lastPrice}`);
            return {
                preco_real: parseFloat(data.lastPrice),
                variacao_percentual: parseFloat(data.priceChangePercent),
                volume: parseFloat(data.volume),
                maxima_dia: parseFloat(data.highPrice),
                minima_dia: parseFloat(data.lowPrice),
                tendencia_macro: parseFloat(data.lastPrice) > parseFloat(data.openPrice) ? 'ALTA' : 'BAIXA',
                fonte: 'Binance'
            };
        }
    } catch (e) {
        logger.warn(`[DataService] ⚠️ Binance falhou para ${symbol}: ${e.message}`);
    }

    // 3. Tentar Polygon.io (Backup)
    try {
        const response = await fetch(`${config.polygon.baseUrl}/v1/open-close/${symbol.replace('/', '')}/2024-01-01?apiKey=${config.polygon.apiKey}`);
        if (!response.ok) throw new Error('Polygon falhou');
        const data = await response.json();
        
        if (data && data.close) {
            logger.info(`[DataService] ✅ Polygon: ${symbol} = ${data.close}`);
            return {
                preco_real: parseFloat(data.close),
                variacao_percentual: 0,
                volume: parseFloat(data.volume),
                maxima_dia: parseFloat(data.high),
                minima_dia: parseFloat(data.low),
                tendencia_macro: 'LATERAL',
                fonte: 'Polygon'
            };
        }
    } catch (e) {
        logger.warn(`[DataService] ⚠️ Polygon falhou para ${symbol}: ${e.message}`);
    }

    // 4. Se todas falharem, retorna null (Indica que não temos dados reais)
    logger.error(`[DataService] ❌ Todas as fontes falharam para ${symbol}`);
    return null;
}

module.exports = { getMarketData };