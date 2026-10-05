// ============================================================
// OTC JUDGE — v2.0 (Motor + Claude Fallback + Nunca NEUTRO)
// ============================================================
const logger = require('../../utils/logger');
const motor = require('../motor');
const anthropicService = require('../../services/anthropic');

async function execute(data, requestId, config) {
  const { visao, quant, contexto } = data;
  logger.info('[OTC Judge] Decisão para OTC', { requestId });
  
  const score = quant.score || 0;
  const rsi = quant.rsi || 50;
  const tendencia = contexto?.tendencia_macro || 'LATERAL';
  const ativo = visao.ativo || 'N/A';
  
  const confianca = motor.calcularConfidence(score);
  const qualidade = motor.calcularQualidade(score, confianca, true);
  
  let direcao = motor.calcularDirecao(score);
  if (direcao === 'NEUTRO' || !direcao) {
    if (score > 0) direcao = 'COMPRA';
    else if (score < 0) direcao = 'VENDA';
    else {
      direcao = (tendencia === 'ALTA') ? 'COMPRA' : 'VENDA';
      logger.info(`[OTC Judge] ℹ️ Score 0 — usando tendência ${tendencia} → ${direcao}`, { requestId });
    }
  }
  
  const justificativa = motor.calcularJustificativa(score, direcao);
  const riscos = motor.calcularRiscos(score, direcao, { rsi, tendencia });
  
  const ancoragemValida = contexto?.ancoragem_valida !== false;
  if (!ancoragemValida) {
    return {
      direcao: 'COMPRA',
      confianca: 0,
      qualidade: 'D',
      timing: 'BLOQUEADO',
      justificativa: '⚠️ Dados reais divergem da imagem. Operação bloqueada.',
      risco_principal: 'Dados divergentes.',
      aviso: '⚠️ Dados divergem. Operação bloqueada.',
      estrategia: { preco_atual: null, stop_loss: null, alvo1: null, entrada: 'BLOQUEADO' }
    };
  }
  
  const precisaIA = (score === 0) || (confianca < 70);
  
  if (precisaIA) {
    try {
      const promptJuiz = `Você é a Filipa, juíza de trading de OTC (opções binárias).

Analise os dados abaixo e SEMPRE indique COMPRA ou VENDA (nunca AGUARDAR ou NEUTRO).

DADOS:
- Ativo: ${ativo}
- Score Quant: ${score} (escala: -3 a +3)
- RSI: ${rsi}
- Tendência: ${tendencia}
- Preço atual: ${visao.preco_atual}
- Confiança do motor: ${confianca}%

REGRAS CRÍTICAS:
1. NUNCA use "AGUARDAR" ou "NEUTRO" — o trader decide se opera
2. Se o sinal for fraco, indique a direção MAS com qualidade baixa (C ou D) e aviso
3. Score positivo OU tendência de alta → COMPRA
4. Score negativo OU tendência de baixa → VENDA
5. Se estiver em dúvida, escolha a direção da tendência

REGRAS DE VOCABULÁRIO OBRIGATÓRIAS:
- RSI > 70 → chamar de "sobreCOMPRA"
- RSI < 30 → chamar de "sobreVENDA"

Responda APENAS este JSON:
{
  "direcao": "COMPRA | VENDA",
  "confianca": 50-90,
  "qualidade": "A | B | C | D",
  "justificativa": "explicação curta em português",
  "risco_principal": "risco principal ou 'Riscos não identificados'",
  "aviso": "aviso curto se qualidade for C ou D (opcional)"
}`;

      const respostaIA = await anthropicService.complete(promptJuiz, {
        maxTokens: 500,
        temperature: 0.2
      });
      
      let textoLimpo = (respostaIA || '').trim();
      const jsonMatch = textoLimpo.match(/{[\s\S]*}/);
      if (jsonMatch) textoLimpo = jsonMatch[0];
      
      const parsedIA = JSON.parse(textoLimpo);
      
      logger.info(`[OTC Judge] 🤖 Claude validou: ${parsedIA.direcao} ${parsedIA.confianca}%`, { requestId });
      
      if (parsedIA.direcao && parsedIA.direcao !== 'AGUARDAR' && parsedIA.direcao !== 'NEUTRO') {
        const direcaoIA = parsedIA.direcao;
        const confiancaIA = parseInt(parsedIA.confianca) || confianca;
        const qualidadeIA = parsedIA.qualidade || qualidade;
        
        const precoIA = parseFloat(visao.preco_atual) || 1.1600;
        const slPips = config.risk.default_sl_pips || 30;
        const tpPips = config.risk.default_tp_pips || 40;
        
        return {
          direcao: direcaoIA,
          confianca: confiancaIA,
          qualidade: qualidadeIA,
          timing: confiancaIA >= 80 ? 'AGORA' : 'PROXIMA_VELA',
          justificativa: `🤖 Claude: ${parsedIA.justificativa}`,
          risco_principal: parsedIA.risco_principal || 'Riscos não identificados',
          aviso: parsedIA.aviso || '',
          estrategia: {
            preco_atual: precoIA,
            stop_loss: direcaoIA === 'VENDA' ? precoIA + (slPips * 0.0001) : precoIA - (slPips * 0.0001),
            alvo1: direcaoIA === 'VENDA' ? precoIA - (tpPips * 0.0001) : precoIA + (tpPips * 0.0001),
            entrada: 'AGORA'
          },
          fonte_decisao: 'claude_fallback'
        };
      }
      
      if (parsedIA.direcao === 'AGUARDAR' || parsedIA.direcao === 'NEUTRO' || !parsedIA.direcao) {
        logger.warn(`[OTC Judge] ⚠️ Claude retornou "${parsedIA.direcao}" — forçando direção`, { requestId });
        
        const direcaoForcada = score > 0 ? 'COMPRA' : score < 0 ? 'VENDA' : (tendencia === 'ALTA' ? 'COMPRA' : 'VENDA');
        const precoForcado = parseFloat(visao.preco_atual) || 1.1600;
        const slPips = config.risk.default_sl_pips || 30;
        const tpPips = config.risk.default_tp_pips || 40;
        
        return {
          direcao: direcaoForcada,
          confianca: parseInt(parsedIA.confianca) || confianca,
          qualidade: parsedIA.qualidade || qualidade || 'D',
          timing: 'PROXIMA_VELA',
          justificativa: `⚠️ ${parsedIA.justificativa || 'Sinal fraco'} (motor local: ${direcaoForcada})`,
          risco_principal: parsedIA.risco_principal || 'Riscos não identificados',
          aviso: parsedIA.aviso || '',
          estrategia: {
            preco_atual: precoForcado,
            stop_loss: direcaoForcada === 'VENDA' ? precoForcado + (slPips * 0.0001) : precoForcado - (slPips * 0.0001),
            alvo1: direcaoForcada === 'VENDA' ? precoForcado - (tpPips * 0.0001) : precoForcado + (tpPips * 0.0001),
            entrada: 'AGORA'
          },
          fonte_decisao: 'claude_fallback_forcado'
        };
      }
      
    } catch (e) {
      logger.warn(`[OTC Judge] ⚠️ Claude falhou, usando motor local: ${e.message}`, { requestId });
    }
  } else {
    logger.info(`[OTC Judge] ℹ️ Motor local OK (score=${score}, conf=${confianca}%) — Claude não necessário`, { requestId });
  }
  
  const preco = parseFloat(visao.preco_atual) || 1.1600;
  const slPips = config.risk.default_sl_pips || 30;
  const tpPips = config.risk.default_tp_pips || 40;
  
  return {
    direcao,
    confianca,
    qualidade,
    timing: confianca >= 80 ? 'AGORA' : 'PROXIMA_VELA',
    justificativa,
    risco_principal: riscos,
    aviso: '',
    estrategia: {
      preco_atual: preco,
      stop_loss: direcao === 'VENDA' ? preco + (slPips * 0.0001) : preco - (slPips * 0.0001),
      alvo1: direcao === 'VENDA' ? preco - (tpPips * 0.0001) : preco + (tpPips * 0.0001),
      entrada: 'AGORA'
    },
    fonte_decisao: 'motor_local'
  };
}

module.exports = { execute };