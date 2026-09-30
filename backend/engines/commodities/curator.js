// ============================================================
// COMMODITIES CURATOR — v2.0 (usa curatorShared)
// ============================================================
const logger = require('../../utils/logger');
const curatorShared = require('../../services/curatorShared');
const { getCommoditySymbol, detectarSessaoCommodities } = require('../../config/commoditiesSymbols');

async function execute(visionData, requestId, config) {
    logger.info('[Commodities Curator] Contexto de commodities', { requestId });

    return curatorShared.execute({
        visionData,
        requestId,
        config,
        marketName: 'Commodities',
        getSymbolFn: getCommoditySymbol,
        getSessionFn: detectarSessaoCommodities,
        validateDivergence: true,     // ✅ TwelveData cobre commodities
        divergenceThreshold: 5,        // 5% (commodities oscilam)
    });
}

module.exports = { execute };