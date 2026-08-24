// ============================================================
// SERVICE — GEMINI VISION
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'fallback-key');

const VISION_PROMPT = `Extraia os dados do gráfico e retorne APENAS JSON.
Formato:
{"ativo":"string","timeframe":"string","preco_atual":null,"candles":[{"open":0,"high":0,"low":0,"close":0}]}`;

// 🔥 FUNÇÃO CORRETA — NOME ESPERADO PELO stageVision
async function analyzeChart(image, model) {
  const modelName = model || process.env.GEMINI_MODEL || 'gemini-3.7-flash';

  console.log(`[GeminiVision] Analisando imagem via Gemini ${modelName}...`);

  const modelInstance = genAI.getGenerativeModel({ model: modelName });

  const imagePart = {
    inlineData: {
      data: image,
      mimeType: 'image/png'
    }
  };

  const result = await modelInstance.generateContent([VISION_PROMPT, imagePart]);
  const response = await result.response;
  const text = response.text();

  console.log('[GeminiVision] ✅ OK');
  return text;
}

module.exports = { analyzeChart };