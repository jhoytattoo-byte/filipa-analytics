const logger = require('../../utils/logger');
const { getMarketData } = require('../../services/dataService');
const { getB3Symbol } = require('../../config/b3Symbols');
const groqService = require('../../services/groq');
const prompts = require('../../config/prompts');

async function execute(visionData, requestId, config) {
  logger.info('[B3 Curator] Contexto B3 + Validação + IA', { requestId });

  const dataBrasilia = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const hora = new Date(dataBrasilia).getHours();
  const sessao = (hora >= 10 && hora < 18) ? 'B3 Aberta (10h-18h)' : 'B3 Fechada';

  let dadosReais = null;
  let ancoragemValida = true;
  let tendenciaMacro = 'LATERAL';

  const b3Info = getB3Symbol(visionData.ativo);
  let simboloAPI = b3Info ? b3Info.api : '';
  
  const ativoLimpo = (visionData.ativo || '').toUpperCase().trim();
  const isFuturo = /^(WIN|WDO|IND|DOL|BIT|ETH|SOL|GLD|BGI)/i.test(ativoLimpo);

  // 🚀 DESBLOQUEIO B3: Se não mapeou e não é futuro, mas tem número no final (ex: LREN3)
  if (!simboloAPI && !isFuturo && /\d+$/.test(ativoLimpo)) {
      simboloAPI = ativoLimpo;
      logger.info(`[B3 Curator] 🔍 Ação não mapeada. Tentando API direta: ${simboloAPI}`, { requestId });
  }

  if (simboloAPI) {
    logger.info(`[B3 Curator] Símbolo API: ${simboloAPI}`, { requestId });
    dadosReais = await getMarketData(visionData.ativo, simboloAPI);

    if (dadosReais) {
      tendenciaMacro = dadosReais.tendencia_macro || 'LATERAL';
      
      if (!isFuturo) {
        const precoVision = parseFloat(visionData.preco_atual);
        if (precoVision && dadosReais.preco_real) {
          const divergencia = Math.abs(precoVision - dadosReais.preco_real);
          if (divergencia > 50) {
            ancoragemValida = false;
            logger.warn(`[B3 Curator] ⚠️ Divergência de ${divergencia} pontos!`, { requestId });
          }
        }
      }
    } else {
        logger.warn(`[B3 Curator] ⚠️ API não retornou dados para ${simboloAPI}`, { requestId });
    }
  } else {
    logger.warn(`[B3 Curator] ⚠️ Ativo não mapeado e sem dedução: ${visionData.ativo}`, { requestId });
  }

  let contextoIA = '';
  try {
    const promptDinamico = `${prompts.curador}

DADOS ATUAIS DO MERCADO B3:
- Ativo: ${visionData.ativo || 'N/A'}
- Timeframe: ${visionData.timeframe || 'N/A'}
- Preço no print: ${visionData.preco_atual || 'N/A'}
- RSI (Print): ${visionData.rsi || 'N/A'}
- Tendência (Print): ${visionData.tendencia || 'N/A'}
- Dados Reais API: ${dadosReais ? `preço = ${dadosReais.preco_real}, tendência = ${dadosReais.tendencia_macro}` : 'indisponível'}

Responda APENAS o JSON. Sem markdown, sem explicações.`;

    const resposta = await groqService.text(promptDinamico);
    let textoLimpo = (resposta || '').trim();
    const jsonMatch = textoLimpo.match(/{[\s\S]*}/);
    if (jsonMatch) textoLimpo = jsonMatch[0];

    const parsed = JSON.parse(textoLimpo);
    contextoIA = parsed.opiniao || '';
    
    if (!contextoIA) logger.warn(`[B3 Curator] ⚠️ JSON sem campo "opiniao"`, { requestId });
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