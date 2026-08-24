// ============================================================
// ENGINE — JUDGE v19.0 (OTC-Friendly)
// ============================================================
// CHANGELOG v19.0:
// - ✅ NÃO penaliza OTC por dados visuais
// - ✅ Aceita confiança >= 60% como operável
// - ✅ Nunca retorna NEUTRO só por ser OTC
// - ✅ Dados visuais são válidos se confiança_extracao >= 60
// ============================================================
const aiConfig = require('../config/ai');
const logger = require('../utils/logger');

function extrairJSONRobusto(texto) {
  if (!texto || typeof texto !== 'string') throw new Error('Texto vazio');
  const limpo = texto.trim();
  try { return JSON.parse(limpo); } catch (e) {}
  const codeBlock = limpo.match(/`(?:json)?\s*([\s\S]*?)`/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch (e) {} }
  const firstBrace = limpo.indexOf('{');
  const lastBrace = limpo.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(limpo.substring(firstBrace, lastBrace + 1)); } catch (e) {}
  }
  throw new Error('JSON nao encontrado na resposta do Juiz');
}

function decidirDirecao(scoreQuant, tendenciaVision, confiancaQuant, rsi, numCandles, isOTC, confiancaExtracao) {
  let direcao;
  let confiancaBase = confiancaQuant;
  
  // Decisão baseada no score
  if (scoreQuant >= 2) {
    direcao = 'COMPRA';
    confiancaBase += 15;
  } else if (scoreQuant <= -2) {
    direcao = 'VENDA';
    confiancaBase += 15;
  } else if (scoreQuant >= 1) {
    direcao = 'COMPRA';
    confiancaBase += 10;
  } else if (scoreQuant <= -1) {
    direcao = 'VENDA';
    confiancaBase += 10;
  } else if (scoreQuant > 0) {
    direcao = 'COMPRA';
    confiancaBase += 5;
  } else if (scoreQuant < 0) {
    direcao = 'VENDA';
    confiancaBase += 5;
  } else {
    // Score zero: usa tendência visual como desempate
    if (tendenciaVision === 'alta') direcao = 'COMPRA';
    else if (tendenciaVision === 'baixa') direcao = 'VENDA';
    else direcao = 'COMPRA'; // Default COMPRA em caso de empate
    confiancaBase -= 5;
  }
  
  // 🔥 CORREÇÃO CRÍTICA: Penalidades DIFERENCIADAS para OTC vs Forex
  
  if (!isOTC) {
    // Forex: penalidades normais (exige dados reais)
    if (rsi === null || rsi === undefined || numCandles < 15) {
      confiancaBase -= 15;
      logger.warn('[Judge] Penalidade Forex: RSI não calculado ou poucos candles');
    }
    if (Math.abs(scoreQuant) < 0.5) {
      confiancaBase -= 10;
    }
  } else {
    // OTC: dados visuais SÃO SUFICIENTES!
    logger.info('[Judge] OTC detectado — dados visuais são válidos');
    
    // Só penaliza se a extração visual for ruim
    if (confiancaExtracao < 50) {
      confiancaBase -= 20;
      logger.warn('[Judge] Penalidade OTC: Confiança extração muito baixa');
    } else if (confiancaExtracao < 70) {
      confiancaBase -= 10;
      logger.warn('[Judge] Penalidade leve OTC: Confiança extração moderada');
    }
    
    // Penaliza se MUITO poucos candles (< 5)
    if (numCandles < 5) {
      confiancaBase -= 15;
      logger.warn('[Judge] Penalidade OTC: Muito poucos candles extraídos');
    }
    
    // BÔNUS: Se OTC tem boa extração e padrão claro, aumenta confiança
    if (confiancaExtracao >= 70 && Math.abs(scoreQuant) >= 1) {
      confiancaBase += 5;
      logger.info('[Judge] Bônus OTC: Boa extração + padrão claro');
    }
  }
  
  // Limita confiança entre 30% e 90%
  confiancaBase = Math.max(30, Math.min(90, Math.round(confiancaBase)));
  
  return { direcao, confiancaBase };
}

function calcularSLTP(direcao, precoAtual, suporte, resistencia) {
  const preco = parseFloat(precoAtual) || 0;
  const sup = parseFloat(suporte) || (preco * 0.995);
  const res = parseFloat(resistencia) || (preco * 1.005);
  
  let sl, tp1, tp2;
  if (direcao === 'COMPRA') {
    sl = Math.min(sup, preco * 0.998);
    tp1 = preco + (preco - sl) * 1.5;
    tp2 = preco + (preco - sl) * 2.5;
  } else {
    sl = Math.max(res, preco * 1.002);
    tp1 = preco - (sl - preco) * 1.5;
    tp2 = preco - (sl - preco) * 2.5;
  }
  
  return {
    sl: Math.round(sl * 100000) / 100000,
    tp1: Math.round(tp1 * 100000) / 100000,
    tp2: Math.round(tp2 * 100000) / 100000
  };
}

function definirQualidade(confianca) {
  if (confianca >= 80) return 'A';
  if (confianca >= 70) return 'B';
  if (confianca >= 60) return 'C';
  if (confianca >= 50) return 'D';
  return 'F';
}

function definirTiming(confianca, scoreQuant) {
  if (confianca >= 75 && Math.abs(scoreQuant) >= 2) return 'AGORA';
  if (confianca >= 65) return 'PROXIMA_VELA';
  if (confianca >= 60) return 'AGUARDAR_MOMENTO';
  return 'AGUARDAR_MOMENTO';
}

function montarDecisaoBase(context) {
  const { visao, quant, contexto } = context;
  
  // Extrai dados com valores padrão seguros
  const scoreQuant = parseFloat(quant?.score) || 0;
  const confiancaQuant = parseInt(quant?.confidence) || 40;
  const rsi = quant?.rsi !== null && quant?.rsi !== undefined ? quant.rsi : null;
  const numCandles = parseInt(quant?.candles_validos) || 0;
  const isOTC = visao?.is_otc || false;
  const confiancaExtracao = parseInt(visao?.confianca_extracao) || 50;
  
  const precoAtual = parseFloat(visao?.preco_atual) || 0;
  const suporte = parseFloat(visao?.suporte) || 0;
  const resistencia = parseFloat(visao?.resistencia) || 0;
  const tendenciaVision = (visao?.tendencia || 'lateral').toLowerCase();
  
  console.log(`[Judge v19.0] Dados: score=${scoreQuant}, conf=${confiancaQuant}, rsi=${rsi}, candles=${numCandles}, OTC=${isOTC}, confExtracao=${confiancaExtracao}`);
  
  // Decide direção com lógica OTC-friendly
  const { direcao, confiancaBase } = decidirDirecao(
    scoreQuant, 
    tendenciaVision, 
    confiancaQuant, 
    rsi, 
    numCandles,
    isOTC,
    confiancaExtracao
  );
  
  // Calcula SL/TP
  const { sl, tp1, tp2 } = calcularSLTP(direcao, precoAtual, suporte, resistencia);
  
  // Define qualidade e timing
  const qualidade = definirQualidade(confiancaBase);
  const timing = definirTiming(confiancaBase, scoreQuant);
  
  // Mensagem sobre RSI
  const observacaoRSI = rsi !== null ? `RSI: ${rsi} (calculado)` : 'RSI: estimado visualmente';
  
  // Alertas específicos para OTC
  const alertas = [];
  if (isOTC) {
    alertas.push('⚠️ Análise visual OTC — confirme na corretora');
    if (visao?.manipulacao_suspeita) {
      alertas.push('🚨 Manipulação suspeita detectada');
    }
  }
  
  return {
    direcao,
    confianca: confiancaBase,
    qualidade,
    justificativa: `Score: ${scoreQuant}. ${observacaoRSI}. Tendência: ${tendenciaVision}. ${numCandles} candles. ${isOTC ? 'OTC analisado visualmente.' : ''}`,
    sl,
    tp: tp1,
    tp2,
    timing,
    risco: confiancaBase >= 70 ? 'BAIXO' : confiancaBase >= 55 ? 'MEDIO' : 'ALTO',
    alertas,
    estrategia: {
      preco_atual: precoAtual,
      stop_loss: sl,
      alvo1: tp1,
      alvo2: tp2,
      entrada: timing,
      tipo_ordem: 'MARKET'
    }
  };
}

async function decide(context) {
  const { visao, quant, contexto } = context;
  const enginesTried = [];
  let lastError = null;
  
  // Monta decisão base (programática)
  const decisaoBase = montarDecisaoBase(context);
  
  logger.info(`[Judge v19.0] Decisão base — ${decisaoBase.direcao} | Conf: ${decisaoBase.confianca}% | Qualidade: ${decisaoBase.qualidade}`);
  
  // Prompt para IA (Claude/DeepSeek)
  const prompt = `Você é FILIPA, juíza de trading especializada em OTC.
  
DADOS TÉCNICOS:
Ativo: ${visao?.ativo || 'N/A'}
Timeframe: ${visao?.timeframe || 'N/A'}
Mercado: ${visao?.is_otc ? 'OTC (visual)' : 'Forex (padrão)'}
Preço Atual: ${visao?.preco_atual || 'N/A'}
Score Quant: ${quant?.score || 0}
Confiança Quant: ${quant?.confidence || 0}%
RSI: ${quant?.rsi !== null ? quant.rsi : 'N/A (estimado)'}
Tendência Vision: ${visao?.tendencia || 'N/A'}
Candles: ${quant?.candles_validos || 0}
Confiança Extração: ${visao?.confianca_extracao || 50}%
Suporte: ${visao?.suporte || 'N/A'}
Resistência: ${visao?.resistencia || 'N/A'}

DIREÇÃO OBRIGATÓRIA (não mude): ${decisaoBase.direcao}
CONFIANÇA BASE: ${decisaoBase.confianca}%
SL sugerido: ${decisaoBase.sl}
TP sugerido: ${decisaoBase.tp}

REGRAS IMPORTANTES:
1. OTC NÃO é inferior. É um mercado diferente.
2. Dados visuais são válidos quando bem extraídos.
3. NUNCA retorne NEUTRO só porque é OTC.
4. Confiança >= 60% = sinal operável.

SUA TAREFA:
1. Escreva uma justificativa técnica (2-3 frases diretas).
2. Confirme ou ajuste levemente SL e TP.
3. Defina timing: "AGORA", "PROXIMA_VELA" ou "AGUARDAR_MOMENTO".
4. Retorne APENAS este JSON:

{
  "direcao": "${decisaoBase.direcao}",
  "confianca": ${decisaoBase.confianca},
  "qualidade": "${decisaoBase.qualidade}",
  "justificativa": "string",
  "sl": ${decisaoBase.sl},
  "tp": ${decisaoBase.tp},
  "timing": "${decisaoBase.timing}",
  "risco": "${decisaoBase.risco}",
  "estrategia": {
    "preco_atual": ${decisaoBase.estrategia.preco_atual},
    "stop_loss": ${decisaoBase.estrategia.stop_loss},
    "alvo1": ${decisaoBase.estrategia.alvo1},
    "alvo2": ${decisaoBase.estrategia.alvo2},
    "entrada": "${decisaoBase.estrategia.entrada}",
    "tipo_ordem": "${decisaoBase.estrategia.tipo_ordem}"
  }
}`;

  // TENTATIVA 1: Claude (prioritário)
  try {
    logger.info(`[Judge] Tentando Claude...`);
    const anthropic = require('../services/anthropic');
    const response = await anthropic.message(prompt);
    const data = extrairJSONRobusto(response);
    
    // Mantém direção e confiança base
    data.direcao = decisaoBase.direcao;
    data.confianca = decisaoBase.confianca;
    data.qualidade = decisaoBase.qualidade;
    
    // Valida SL/TP
    const slValido = data.sl && !isNaN(parseFloat(data.sl));
    const tpValido = data.tp && !isNaN(parseFloat(data.tp));
    
    const resultado = {
      direcao: data.direcao,
      confianca: data.confianca,
      qualidade: data.qualidade,
      justificativa: data.justificativa || decisaoBase.justificativa,
      sl: slValido ? parseFloat(data.sl) : decisaoBase.sl,
      tp: tpValido ? parseFloat(data.tp) : decisaoBase.tp,
      timing: ['AGORA', 'PROXIMA_VELA', 'AGUARDAR_MOMENTO'].includes(data.timing) ? data.timing : decisaoBase.timing,
      risco: ['BAIXO', 'MEDIO', 'ALTO'].includes(data.risco) ? data.risco : decisaoBase.risco,
      alertas: decisaoBase.alertas,
      estrategia: {
        preco_atual: parseFloat(data.estrategia?.preco_atual) || decisaoBase.estrategia.preco_atual,
        stop_loss: slValido ? parseFloat(data.sl) : decisaoBase.estrategia.stop_loss,
        alvo1: tpValido ? parseFloat(data.tp) : decisaoBase.estrategia.alvo1,
        alvo2: parseFloat(data.estrategia?.alvo2) || decisaoBase.estrategia.alvo2,
        entrada: data.estrategia?.entrada || decisaoBase.estrategia.entrada,
        tipo_ordem: data.estrategia?.tipo_ordem || decisaoBase.estrategia.tipo_ordem
      },
      _meta: { engine: 'claude', model: aiConfig.judge.models.claude, fallback: false }
    };
    
    logger.info(`[Judge] ✅ Claude OK — ${resultado.direcao} | ${resultado.confianca}% | ${resultado.qualidade}`);
    return resultado;
    
  } catch (error) {
    lastError = error;
    enginesTried.push({ engine: 'claude', error: error.message });
    logger.error(`[Judge] ❌ Claude falhou: ${error.message}`);
  }
  
  // TENTATIVA 2: DeepSeek fallback
  try {
    logger.info(`[Judge] Tentando DeepSeek fallback...`);
    const deepseek = require('../services/deepseek');
    const response = await deepseek.chat([
      { role: 'system', content: 'Você é FILIPA Juiz. Retorne APENAS JSON.' },
      { role: 'user', content: prompt }
    ]);
    const data = extrairJSONRobusto(response);
    
    data.direcao = decisaoBase.direcao;
    data.confianca = Math.max(40, decisaoBase.confianca - 10); // Penalidade leve
    data.qualidade = definirQualidade(data.confianca);
    
    return {
      direcao: data.direcao,
      confianca: data.confianca,
      qualidade: data.qualidade,
      justificativa: data.justificativa || decisaoBase.justificativa,
      sl: data.sl || decisaoBase.sl,
      tp: data.tp || decisaoBase.tp,
      timing: data.timing || decisaoBase.timing,
      risco: data.risco || decisaoBase.risco,
      alertas: decisaoBase.alertas,
      estrategia: data.estrategia || decisaoBase.estrategia,
      _meta: { engine: 'deepseek', model: aiConfig.judge.models.deepseek, fallback: true }
    };
    
  } catch (error) {
    enginesTried.push({ engine: 'deepseek', error: error.message });
    logger.error(`[Judge] ❌ DeepSeek fallback falhou: ${error.message}`);
  }
  
  // TENTATIVA 3: Groq text fallback
  try {
    logger.info(`[Judge] Tentando Groq text fallback...`);
    const groq = require('../services/groq');
    const response = await groq.complete(prompt, { jsonMode: true });
    const data = extrairJSONRobusto(response);
    
    data.direcao = decisaoBase.direcao;
    data.confianca = Math.max(35, decisaoBase.confianca - 15);
    data.qualidade = 'D';
    
    return {
      direcao: data.direcao,
      confianca: data.confianca,
      qualidade: data.qualidade,
      justificativa: data.justificativa || decisaoBase.justificativa,
      sl: data.sl || decisaoBase.sl,
      tp: data.tp || decisaoBase.tp,
      timing: data.timing || decisaoBase.timing,
      risco: data.risco || decisaoBase.risco,
      alertas: decisaoBase.alertas,
      estrategia: data.estrategia || decisaoBase.estrategia,
      _meta: { engine: 'groq_text', model: aiConfig.judge.models.groq_text, fallback: true }
    };
    
  } catch (error) {
    enginesTried.push({ engine: 'groq_text', error: error.message });
    logger.error(`[Judge] ❌ Groq fallback falhou: ${error.message}`);
  }
  
  // TODAS FALHARAM → retorna decisão base programática
  logger.warn('[Judge] ⚠️ Todas as engines falharam. Retornando decisão base.');
  return {
    ...decisaoBase,
    justificativa: decisaoBase.justificativa + ' [Análise automatizada — IA indisponível]',
    _meta: { engine: 'programatico', fallback: true, warning: '️ Modo 100% programático.' }
  };
}

module.exports = { decide };