// ============================================================
// STOCKS CURATOR — v2.0 (usa curatorShared)
// ============================================================
const logger = require('../../utils/logger');
const curatorShared = require('../../services/curatorShared');
const { getStockSymbol, detectarSessaoStocks } = require('../../config/stocksSymbols');

async function execute(visionData, requestId, config) {
    logger.info('[Stocks Curator] Contexto de mercado de ações', { requestId });

    return curatorShared.execute({
        visionData,
        requestId,
        config,
        marketName: 'Stocks',
        getSymbolFn: getStockSymbol,
        getSessionFn: detectarSessaoStocks,
        validateDivergence: true,     // ✅ TwelveData cobre EUA
        divergenceThreshold: 5,   // 5% (tolerante a diferenças de fonte/spread)
    });
}

module.exports = { execute };