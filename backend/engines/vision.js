// ============================================================
// ENGINE — VISION v17.9
// ============================================================

const groqService = require('../services/groq');
const { extrairJSON, mapearParaFilipa } = require('../utils/parser');
const logger = require('../utils/logger');

async function extract(image, requestId) {
  try {
    logger.info('[Vision] Extraindo dados do gráfico...', { requestId });

    // 🔥 CHAMA O GROQ (QUE TEM FALLBACK INTERNO PARA QWEN + GEMINI)
    const response = await groqService.vision(image);

    const parsed = extrairJSON(response);
    const result = mapearParaFilipa(parsed);

    const numCandles = result.candles?.length || 0;
    logger.info(`[Vision] OK — Ativo: ${result.ativo || 'N/A'}, Candles: ${numCandles}`, { requestId });

    return result;

  } catch (error) {
    logger.error(`[Vision] Falhou: ${error.message}`, { requestId });
    throw new Error(`Falha na extração da imagem: ${error.message}`);
  }
}

module.exports = { extract };