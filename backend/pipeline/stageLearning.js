// ============================================================
// PIPELINE — STAGE LEARNING
// ============================================================

const learningEngine = require('../engines/learning');
const logger = require('../utils/logger');

async function execute(context, requestId) {
    try {
        logger.info('[Learning] Salvando operação...', { requestId });

        await learningEngine.save(context);

        logger.info('[Learning] OK — Operação salva', { requestId });

        return true;

    } catch (error) {
        logger.error(`[Learning] Falhou: ${error.message}`, { requestId });
        return false;
    }
}

module.exports = { execute };