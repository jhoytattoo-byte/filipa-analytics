// ============================================================
// FUNDS CURATOR — v2.0 (usa curatorShared)
// ============================================================
const logger = require('../../utils/logger');
const curatorShared = require('../../services/curatorShared');
const { getFundSymbol, detectarSessaoFunds } = require('../../config/fundsSymbols');

async function execute(visionData, requestId, config) {
    logger.info('[Funds Curator] Contexto de FIIs', { requestId });

    return curatorShared.execute({
        visionData,
        requestId,
        config,
        marketName: 'Funds',
        getSymbolFn: getFundSymbol,
        getSessionFn: detectarSessaoFunds,
        validateDivergence: true,     // ✅ Brapi cobre FIIs
        divergenceThreshold: 2,        // 2% (FIIs oscilam pouco)
    });
}

module.exports = { execute };