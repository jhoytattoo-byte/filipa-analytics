// services/twelveDataService.js
// Busca candles REAIS. Spot = TwelveData. OTC = vision_fallback.

const axios = require('axios');

const TWELVE_DATA_KEY = process.env.TWELVEDATA_API_KEY || '7481f3fe6d8e4149aced85f0ed7b6bbe';
const BASE_URL = 'https://api.twelvedata.com';

/**
 * Extrai string de ativo de qualquer formato (string ou objeto)
 */
function extractAtivo(ativoInput) {
  if (typeof ativoInput === 'string') {
    return ativoInput;
  }
  if (ativoInput && typeof ativoInput === 'object') {
    // Tenta extrair de varias propriedades comuns
    return ativoInput.ativo 
      || ativoInput.symbol 
      || ativoInput.name 
      || ativoInput.asset 
      || ativoInput.pair
      || JSON.stringify(ativoInput);
  }
  return String(ativoInput);
}

/**
 * Extrai string de timeframe e normaliza para TwelveData
 */
function normalizeTimeframe(tfInput) {
  const tf = String(tfInput).toLowerCase().trim();

  // Se ja termina com 'min', retorna como está
  if (tf.endsWith('min')) return tf;

  // Se termina com 'm', substitui por 'min'
  if (tf.endsWith('m')) return tf.slice(0, -1) + 'min';

  // Se termina com 'h', retorna como está (TwelveData aceita '1h')
  if (tf.endsWith('h')) return tf;

  return tf;
}

function mapSymbol(ativo) {
  const clean = String(ativo).replace(/\s*\(OTC\)/gi, '').trim().toUpperCase();

  const map = {
    'EUR/USD': 'EUR/USD',
    'GBP/USD': 'GBP/USD',
    'USD/JPY': 'USD/JPY',
    'USD/CHF': 'USD/CHF',
    'AUD/USD': 'AUD/USD',
    'USD/CAD': 'USD/CAD',
    'NZD/USD': 'NZD/USD',
    'GBP/JPY': 'GBP/JPY',
    'EUR/GBP': 'EUR/GBP',
    'EUR/NZD': 'EUR/NZD',
    'USD/BRL': 'USD/BRL',
    'XAU/USD': 'XAU/USD',
    'BTC/USD': 'BTC/USD',
    'ETH/USD': 'ETH/USD',
    'BITCOIN/GOLD': null,
  };

  return map[clean] || clean;
}

function isOTC(ativo) {
  return /\(OTC\)/i.test(String(ativo));
}

async function fetchMarketData(ativoInput, timeframeInput = '1min', limit = 50) {
  const ativo = extractAtivo(ativoInput);
  const timeframe = normalizeTimeframe(timeframeInput);

  console.log(`[TD] Recebido: ativo=${JSON.stringify(ativoInput).slice(0,80)} | tf=${JSON.stringify(timeframeInput).slice(0,20)}`);
  console.log(`[TD] Extraido: ativo="${ativo}" | timeframe="${timeframe}"`);

  if (isOTC(ativo)) {
    console.log(`[TD] ${ativo} é OTC — pulando API`);
    return { candles: [], fonte: 'vision_fallback', degradacao: 1 };
  }

  const symbol = mapSymbol(ativo);
  if (!symbol) {
    console.log(`[TD] ${ativo} nao mapeado — vision_fallback`);
    return { candles: [], fonte: 'vision_fallback', degradacao: 1 };
  }

  const url = `${BASE_URL}/time_series`;

  try {
    console.log(`[TD] Buscando ${symbol} | ${timeframe} | ${limit} candles...`);
    const response = await axios.get(url, {
      params: {
        symbol,
        interval: timeframe,
        outputsize: limit,
        apikey: TWELVE_DATA_KEY
      },
      timeout: 10000
    });

    if (response.data.status === 'error') {
      throw new Error(response.data.message);
    }

    const raw = response.data.values || [];
    if (!raw.length) {
      throw new Error('Nenhum candle retornado');
    }

    const candles = raw.reverse().map(c => ({
      timestamp: c.datetime,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close)
    }));

    console.log(`[TD] ✅ ${symbol}: ${candles.length} candles reais`);
    return { candles, fonte: 'twelveData', degradacao: 0 };

  } catch (error) {
    console.error(`[TD] FALHA ${symbol}: ${error.message}`);
    return { candles: [], fonte: 'vision_fallback', degradacao: 1 };
  }
}

async function fetchCandles(ativoInput, timeframeInput, limit) {
  return fetchMarketData(ativoInput, timeframeInput, limit);
}

module.exports = { fetchMarketData, fetchCandles, isOTC, mapSymbol, extractAtivo };