const logger = require('../../utils/logger');
const { getMarketData } = require('../../services/dataService');
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

  const simboloAPI = visionData.ativo === 'WIN' ? '^BVSP' : 
                      visionData.ativo === 'WDO' ? 'USDBRL' : 
                      visionData.ativo === 'BIT' ? 'BTCUSD' : '';

  if (simboloAPI) {
    dadosReais = await getMarketData(visionData.ativo, simboloAPI);
    
    if (dadosReais) {
      const precoVision = parseFloat(visionData.preco_atual);
      if (precoVision && dadosReais.preco_real) {
        const divergencia = Math.abs(precoVision - dadosReais.preco_real);
        if (divergencia > 50) {
          ancoragemValida = false;
          logger.warn(`[B3 Curator] ⚠️ Divergência de ${divergencia} pontos detectada!`);
        }
      }
      tendenciaMacro = dadosReais.tendencia_macro || 'LATERAL';
    }
  }

  let contextoIA = '';
  try {
    const promptCurador = prompts.curador;
    const resposta = await groqService.text(promptCurador, 'qwen/qwen3.6-27b');
    const parsed = JSON.parse(resposta);
    contextoIA = parsed.opiniao || '';
  } catch (e) {
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