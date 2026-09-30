// ============================================================
// OTC CURATOR — v2.0 (usa curatorShared)
// ============================================================
const logger = require('../../utils/logger');
const curatorShared = require('../../services/curatorShared');
const { getOTCSymbol, detectarSessaoOTC } = require('../../config/otcSymbols');

async function execute(visionData, requestId, config) {
    logger.info('[OTC Curator] Contexto de mercado OTC', { requestId });

    return curatorShared.execute({
        visionData,
        requestId,
        config,
        marketName: 'OTC',
        getSymbolFn: getOTCSymbol,
        getSessionFn: detectarSessaoOTC,
        validateDivergence: false,
    });
}

module.exports = { execute };