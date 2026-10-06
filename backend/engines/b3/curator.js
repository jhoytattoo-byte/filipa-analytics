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

  const b3Info = getB3Symbol(visionData.ativo);
  const simboloAPI = b3Info ? b3Info.api : '';

  const isFuturo = /^(WIN|WDO|IND|DOL|BIT|ETH|SOL|GLD|BGI)/i.test(visionData.ativo);

  if (simboloAPI) {
    logger.info(`[B3 Curator] Símbolo API: ${simboloAPI} (${b3Info.nome})`, { requestId });
    dadosReais = await getMarketData(visionData.ativo, simboloAPI);

    if (dadosReais) {
      if (isFuturo) {
        logger.info(`[B3 Curator] ℹ️ Contrato futuro (${visionData.ativo}) — sem validação cruzada`, { requestId });
        tendenciaMacro = dadosReais.tendencia_macro || 'LATERAL';
      } else {
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
    }
  } else {
    logger.warn(`[B3 Curator] Ativo não mapeado: ${visionData.ativo}`, { requestId });
  }

  let contextoIA = '';
  try {
    const promptCurador = prompts.curador;
    const resposta = await groqService.text(promptCurador);

    logger.info(`[B3 Curator] 🔍 Resposta bruta (200 chars): ${(resposta || '').substring(0, 200)}`, { requestId });

    let textoLimpo = (resposta || '').trim();
    const jsonMatch = textoLimpo.match(/{[\s\S]*}/);
    if (jsonMatch) {
      textoLimpo = jsonMatch[0];
    }

    const parsed = JSON.parse(textoLimpo);
    contextoIA = parsed.opiniao || '';

    if (!contextoIA) {
      logger.warn(`[B3 Curator] ⚠️ Modelo retornou JSON sem campo "opiniao". Chaves: ${Object.keys(parsed).join(', ')}`, { requestId });
    } else {
      logger.info(`[B3 Curator] ✅ IA gerou contexto: "${contextoIA.substring(0, 100)}..."`, { requestId });
    }
  } catch (e) {
    logger.warn(`[B3 Curator] ⚠️ IA falhou: ${e.message}`, { requestId });
    contextoIA = '';
  }

  return {
    regime: tendenciaMacro,
    volatilidade: dadosReais?.volatilidade || 'NORMAL',
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