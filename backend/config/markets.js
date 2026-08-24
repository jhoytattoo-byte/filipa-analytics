// ============================================================
// CONFIGURAÇÃO DE MERCADOS — FILIPA v18.0
// ============================================================
module.exports = {
  otc: {
    name: 'OTC (Corretora)',
    icon: '',
    vision: { provider: 'qwen', turbo: true, timeout: 10000 },
    quant: { engine: 'otc', candles: 10, rsi_period: 7 },
    curator: { engine: 'local' },
    judge: { engine: 'local_fast', claude_fallback: false },
    risk: { default_sl_pips: 30, default_tp_pips: 40 }
  },
  
  forex: {
    name: 'Forex Spot',
    icon: '💱',
    vision: { provider: 'groq', turbo: false, timeout: 15000 },
    quant: { engine: 'forex', candles: 50, rsi_period: 14 },
    curator: { engine: 'twelvedata', finnhub: true },
    judge: { engine: 'claude', claude_fallback: true },
    risk: { default_sl_pips: 20, default_tp_pips: 30 }
  },
  
  b3: {
    name: 'B3 (Bolsa Brasil)',
    icon: '🇧🇷',
    vision: { provider: 'qwen', turbo: false, timeout: 15000 },
    quant: { engine: 'b3', candles: 30, rsi_period: 14, points_mode: true },
    curator: { engine: 'b3_api', cei: true },
    judge: { engine: 'claude', claude_fallback: true },
    risk: { default_sl_points: 100, default_tp_points: 200 }
  },
  
  crypto: {
    name: 'Criptomoedas',
    icon: '₿',
    vision: { provider: 'qwen', turbo: false, timeout: 15000 },
    quant: { engine: 'crypto', candles: 50, rsi_period: 14 },
    curator: { engine: 'coingecko', binance: true },
    judge: { engine: 'claude', claude_fallback: true },
    risk: { default_sl_percent: 2, default_tp_percent: 5 }
  },
  
  stocks: {
    name: 'Ações EUA',
    icon: '📈',
    vision: { provider: 'groq', turbo: false, timeout: 15000 },
    quant: { engine: 'stocks', candles: 50, rsi_period: 14 },
    curator: { engine: 'alphavantage', finnhub: true },
    judge: { engine: 'claude', claude_fallback: true },
    risk: { default_sl_percent: 3, default_tp_percent: 6 }
  },
  
  commodities: {
    name: 'Commodities',
    icon: '🥇',
    vision: { provider: 'groq', turbo: false, timeout: 15000 },
    quant: { engine: 'commodities', candles: 50, rsi_period: 14 },
    curator: { engine: 'twelvedata', finnhub: true },
    judge: { engine: 'claude', claude_fallback: true },
    risk: { default_sl_percent: 2, default_tp_percent: 4 }
  }
};