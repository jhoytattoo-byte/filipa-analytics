const logger = require('../../utils/logger');
const { getMarketData } = require('../../services/dataService');
const { getB3Symbol } = require('../../config/b3Symbols');
const groqService = require('../../services/groq');
const prompts = require('../../config/prompts');

async function execute(visionData, requestId, config) {
  logger.info('[B3 Curator] Contexto B3 + Validação de Dados + IA (DeepSeek/Groq)', { requestId });
  
  const dataBrasilia = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const hora = new Date(dataBrasilia).getHours();

  const sessao = (hora >= 10 && hora < 18) ? 'B3 Aberta (10h-18h)' : 'B3 Fechada'; 

  let dadosReais = null;
  let ancoragemValida = true;
  let tendenciaMacro = 'LATERAL';

  // 🔥 BLOCO 2: Mapeamento robusto (aceita WINV26, WDOV26, PETR4, etc.)
  const b3Info = getB3Symbol(visionData.ativo);
  const simboloAPI = b3Info ? b3Info.api : '';

  if (simboloAPI) {
    logger.info(`[B3 Curator] Símbolo API: ${simboloAPI} (${b3Info.nome})`, { requestId });
    dadosReais = await getMarketData(visionData.ativo, simboloAPI);
    
    if (dadosReais) {
      const precoVision = parseFloat(visionData.preco_atual);
      if (precoVision && dadosReais.preco_real) {
        const divergencia = Math.abs(precoVision - dadosReais.preco_real);
        if (divergencia > 50) {
          ancoragemValida = false;
          logger.warn(`[B3 Curator] ⚠️ Divergência de ${divergencia} pontos detectada!`, { requestId });
        }
      }
      tendenciaMacro = dadosReais.tendencia_macro || 'LATERAL';
    }
  } else {
    logger.warn(`[B3 Curator] Ativo não mapeado: ${visionData.ativo}`, { requestId });
  }

  let contextoIA = '';
  try {
    const promptCurador = prompts.curador;
    const resposta = await groqService.text(promptCurador, 'qwen/qwen3.8-27b');
    const parsed = JSON.parse(resposta);
    contextoIA = parsed.opiniao || '';
  } catch (e) {
    logger.warn(`[B3 Curator] ⚠️ IA falhou: ${e.message}`, { requestId });
    contextoIA = '';
  }

  return {
    // ✅ AGORA É DINÂMICO!
    regime: tendenciaMacro, // ✅ Baseado na tendência macro real
    volatilidade: dadosReais?.volatilidade || 'NORMAL', // ✅ Dinâmico
    sessao: sessao,
    noticias: dadosReais ? 'Dados reais obtidos' : 'Sem dados reais',
    source: dadosReais ? dadosReais.fonte : 'local_default',
    market_hours: '10:00-17:00 BRT',
    
    dados_reais: dadosReais,
    ancoragem_valida: ancoragemValida,
    tendencia_macro: tendenciaMacro,
    preco_real: dadosReais ? dadosReais.preco_real : null,
    
    opiniao_ia: contextoIA
  };
}

module.exports = { execute };