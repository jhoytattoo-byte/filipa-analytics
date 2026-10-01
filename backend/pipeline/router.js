// ============================================================
// ROUTER — Carrega engines específicas por mercado (v2.0)
// ============================================================
// CHANGELOG v2.0:
// - Detecção por PREFIXO em vez de mapa exato (robusto a novos ativos)
// - Corrige bug onde forex_eurusd caía no fallback OTC
// - Aceita qualquer sufixo: forex_*, b3_*, crypto_*, etc.
// ============================================================
const logger = require('../utils/logger');
const marketConfig = require('../config/markets');

// Cache de engines carregadas (para performance)
const engineCache = {};

// ============================================================
// DETECÇÃO DE MERCADO POR PREFIXO
// ============================================================
function getMarketType(marketKey) {
  if (!marketKey || typeof marketKey !== 'string') return 'otc';
  
  const key = marketKey.toLowerCase().trim();
  
  // Detecção por prefixo (aceita qualquer sufixo)
 if (key.startsWith('b3_'))          return 'b3';
if (key.startsWith('forex'))        return 'forex';
if (key.startsWith('crypto'))       return 'crypto';
if (key.startsWith('stocks'))       return 'stocks';
if (key.startsWith('commodities'))  return 'commodities';
if (key.startsWith('indices'))      return 'indices';   // ✅ engine própria
if (key.startsWith('funds'))        return 'stocks';    // ⚠️ ainda temporário
if (key.startsWith('otc'))          return 'otc';
  
  // Casos exatos sem prefixo (legado)
  if (key === 'forex' || key === 'b3' || key === 'crypto' || 
      key === 'stocks' || key === 'commodities' || key === 'otc') {
    return key;
  }
  
  // Fallback final
  logger.warn(`[Router] Mercado desconhecido: ${marketKey}, usando OTC`);
  return 'otc';
}

// ============================================================
// CARREGA ENGINES
// ============================================================
function getEngines(marketKey) {
  const marketType = getMarketType(marketKey);
  const config = marketConfig[marketType];
  
  if (!config) {
    logger.warn(`[Router] Mercado ${marketKey} (tipo: ${marketType}) não configurado, usando OTC`);
    return getEngines('otc');
  }
  
  // Retorna do cache se já foi carregado
  if (engineCache[marketType]) {
    return engineCache[marketType];
  }
  
  logger.info(`[Router] 🎯 Carregando engines para: ${marketType.toUpperCase()}`);
  
  // Carrega os 4 arquivos da pasta específica
  const engines = {
    vision: require(`../engines/${marketType}/vision`),
    quant: require(`../engines/${marketType}/quant`),
    curator: require(`../engines/${marketType}/curator`),
    judge: require(`../engines/${marketType}/judge`),
    config: config
  };
  
  // Salva no cache
  engineCache[marketType] = engines;
  
  return engines;
}

// ============================================================
// RETORNA INFO DO MERCADO
// ============================================================
function getMarketInfo(marketKey) {
  const marketType = getMarketType(marketKey);
  return marketConfig[marketType] || marketConfig.otc;
}

module.exports = { getEngines, getMarketInfo, getMarketType };