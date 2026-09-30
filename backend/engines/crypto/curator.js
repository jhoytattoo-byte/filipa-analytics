// ============================================================
// CRYPTO CURATOR — v2.0 (usa curatorShared)
// ============================================================
const logger = require('../../utils/logger');
const curatorShared = require('../../services/curatorShared');
const { getCryptoSymbol, detectarSessaoCrypto } = require('../../config/cryptoSymbols');

async function execute(visionData, requestId, config) {
    logger.info('[Crypto Curator] Contexto de mercado cripto', { requestId });

    return curatorShared.execute({
        visionData,
        requestId,
        config,
        marketName: 'Crypto',
        getSymbolFn: getCryptoSymbol,
        getSessionFn: detectarSessaoCrypto,
        validateDivergence: true,       // ✅ Crypto TEM dado real (Binance)
        divergenceThreshold: 5,         // 5% de tolerância (cripto é volátil)
    });
}

module.exports = { execute };