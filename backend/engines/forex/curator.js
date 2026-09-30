// ============================================================
// FOREX CURATOR — v2.0 (usa curatorShared)
// ============================================================
const logger = require('../../utils/logger');
const curatorShared = require('../../services/curatorShared');
const { getForexSymbol, detectarSessaoForex } = require('../../config/forexSymbols');

async function execute(visionData, requestId, config) {
    logger.info('[Forex Curator] Contexto de mercado Forex', { requestId });

    return curatorShared.execute({
        visionData,
        requestId,
        config,
        marketName: 'Forex',
        getSymbolFn: getForexSymbol,
        getSessionFn: detectarSessaoForex,
        validateDivergence: false,  // Forex: sem validação cruzada
    });
}

module.exports = { execute };