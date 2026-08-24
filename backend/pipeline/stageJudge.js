// ============================================================
// PIPELINE — STAGE JUDGE
// ============================================================

const judgeEngine = require('../engines/judge');
const logger = require('../utils/logger');

async function execute(context, requestId) {
    try {
        logger.info('[Judge] Tomando decisão...', { requestId });

        const result = await judgeEngine.decide(context, requestId);

        if (!result) {
            throw new Error('Decisão retornou vazia');
        }

        logger.info(`[Judge] OK — ${result.direcao} | Conf: ${result.confianca}% | Qual: ${result.qualidade}`, { requestId });

        return result;

    } catch (error) {
        logger.error(`[Judge] Falhou: ${error.message}`, { requestId });
        throw error;
    }
}

module.exports = { execute };