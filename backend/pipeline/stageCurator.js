// ============================================================
// PIPELINE — STAGE CURATOR
// ============================================================

const curatorEngine = require('../engines/curator');
const logger = require('../utils/logger');

async function execute(visao, requestId) {
    try {
        const ativo = visao?.ativo || 'EUR/USD';
        const timeframe = visao?.timeframe || 'M5';

        logger.info('[Curator] Buscando contexto de mercado...', { requestId, ativo });

        const result = await curatorEngine.getContext(ativo, timeframe);

        logger.info(`[Curator] OK — Source: ${result.source || 'N/A'}, Regime: ${result.regime || 'N/A'}`, { requestId });

        return result;

    } catch (error) {
        logger.error(`[Curator] Falhou: ${error.message}`, { requestId });
        throw error;
    }
}

module.exports = { execute };