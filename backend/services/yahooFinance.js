// ============================================================
// yahooFinance.js — Fonte grátis para índices globais
// ============================================================
// API não-oficial do Yahoo Finance.
// Cobre TODOS os índices globais gratuitamente.
// Fallback: usado quando TwelveData falha (não cobre índices no plano free)
// ============================================================

const logger = require('../utils/logger');

async function getYahooData(symbol) {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; FilipaAnalytics/1.0)'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        if (!data.chart || !data.chart.result || !data.chart.result[0]) {
            throw new Error('Resposta vazia');
        }
        
        const result = data.chart.result[0];
        const meta = result.meta;
        
        const preco = meta.regularMarketPrice;
        const precoAnterior = meta.chartPreviousClose || meta.previousClose || preco;
        
        if (!preco) throw new Error('Preço indisponível');
        
        logger.info(`[YahooFinance] ✅ ${symbol} = ${preco}`);
        
        return {
            preco_real: preco,
            variacao_percentual: precoAnterior ? ((preco - precoAnterior) / precoAnterior) * 100 : 0,
            volume: meta.regularMarketVolume || 0,
            maxima_dia: meta.regularMarketDayHigh || preco,
            minima_dia: meta.regularMarketDayLow || preco,
            tendencia_macro: preco > precoAnterior ? 'ALTA' : 'BAIXA',
            fonte: 'YahooFinance'
        };
    } catch (e) {
        logger.warn(`[YahooFinance] ⚠️ Falhou para ${symbol}: ${e.message}`);
        return null;
    }
}

module.exports = { getYahooData };