// ============================================================
// ROUTER — Carrega engines específicas por mercado
// ============================================================
const logger = require('../utils/logger');
const marketConfig = require('../config/markets');

// Cache de engines carregadas (para performance)
const engineCache = {};

// Mapeia chaves específicas para a pasta base da engine
function getMarketType(marketKey) {
  const map = {
    'otc': 'otc',
    'forex': 'forex',
    'b3_win': 'b3',
    'b3_wdo': 'b3',
    'b3_bit': 'b3',
    'b3_eth': 'b3',
    'b3_sol': 'b3',
    'b3_gld': 'b3',
    'crypto_btc': 'crypto',
    'crypto_eth': 'crypto',
    'crypto_sol': 'crypto',
    'stocks_aapl': 'stocks',
    'stocks_tsla': 'stocks',
    'commodities_gold': 'commodities',
    'commodities_oil': 'commodities'
  };
  
  // Se não achar, usa otc como fallback
  return map[marketKey] || 'otc';
}

function getEngines(marketKey) {
  const marketType = getMarketType(marketKey);
  const config = marketConfig[marketType];
  
  if (!config) {
    logger.warn(`[Router] Mercado ${marketKey} não configurado, usando OTC`);
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

function getMarketInfo(marketKey) {
  const marketType = getMarketType(marketKey);
  return marketConfig[marketType] || marketConfig.otc;
}

module.exports = { getEngines, getMarketInfo, getMarketType };