// ============================================================
// INDICES CURATOR — v2.0 (usa curatorShared)
// ============================================================
const logger = require('../../utils/logger');
const curatorShared = require('../../services/curatorShared');
const { getIndiceSymbol, detectarSessaoIndice } = require('../../config/indicesSymbols');

async function execute(visionData, requestId, config) {
    logger.info('[Indices Curator] Contexto de índices globais', { requestId });

    return curatorShared.execute({
        visionData,
        requestId,
        config,
        marketName: 'Indices',
        getSymbolFn: getIndiceSymbol,
        getSessionFn: () => detectarSessaoIndice(visionData.ativo),
        validateDivergence: true,     // ✅ Yahoo Finance cobre índices
        divergenceThreshold: 200,     // 200 pontos (índices oscilam muito)
    });
}

module.exports = { execute };