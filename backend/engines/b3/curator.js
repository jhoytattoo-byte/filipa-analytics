const logger = require('../../utils/logger');
const { getMarketData } = require('../../services/dataService');

async function execute(visionData, requestId, config) {
  logger.info('[B3 Curator] Contexto B3/CEI + Validação de Dados', { requestId });
  
  // Força o cálculo da hora no fuso horário de Brasília
  const dataBrasilia = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  const hora = new Date(dataBrasilia).getHours();

  const sessao = (hora >= 10 && hora < 18) ? 'B3 Aberta (10h-18h)' : 'B3 Fechada'; 

  // 🔥 NOVO: Validação de Dados Reais
  let dadosReais = null;
  let ancoragemValida = true;
  let tendenciaMacro = 'LATERAL';

  // Identifica o símbolo da API baseado no ativo
  const simboloAPI = visionData.ativo === 'WIN' ? '^BVSP' : 
                      visionData.ativo === 'WDO' ? 'USDBRL' : 
                      visionData.ativo === 'BIT' ? 'BTCUSD' : '';

  if (simboloAPI) {
    dadosReais = await getMarketData(visionData.ativo, simboloAPI);
    
    if (dadosReais) {
      // Compara preço real com preço da Vision (tolerância de 50 pontos)
      const precoVision = parseFloat(visionData.preco_atual);
      if (precoVision && dadosReais.preco_real) {
        const divergencia = Math.abs(precoVision - dadosReais.preco_real);
        if (divergencia > 50) {
          ancoragemValida = false;
          logger.warn(`[B3 Curator] ⚠️ Divergência de ${divergencia} pontos detectada!`);
        }
      }
      
      // Força tendência macro a partir dos dados reais
      tendenciaMacro = dadosReais.tendencia_macro || 'LATERAL';
    }
  }

  return {
    regime: 'LATERAL',
    volatilidade: 'NORMAL',
    sessao: sessao,
    noticias: dadosReais ? 'Dados reais obtidos' : 'Sem dados reais',
    source: dadosReais ? dadosReais.fonte : 'local_default',
    market_hours: '10:00-17:00 BRT',
    
    // 🔥 NOVOS DADOS VALIDADOS
    dados_reais: dadosReais,
    ancoragem_valida: ancoragemValida,
    tendencia_macro: tendenciaMacro,
    preco_real: dadosReais ? dadosReais.preco_real : null
  };
}

module.exports = { execute };