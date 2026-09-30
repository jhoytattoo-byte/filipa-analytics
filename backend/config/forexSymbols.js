// ============================================================
// forexSymbols.js — Mapeamento de pares Forex → símbolos TwelveData
// ============================================================
// TwelveData usa formato BASE/COTAÇÃO (ex: EUR/USD)
// Plano grátis cobre Forex. ✅
// ============================================================

const FOREX_SYMBOLS = {
    // === Pares principais (majors) ===
    'EURUSD': { api: 'EUR/USD', nome: 'Euro / Dólar', marketHours: 'Londres + NY' },
    'USDJPY': { api: 'USD/JPY', nome: 'Dólar / Iene', marketHours: 'Tóquio + NY' },
    'GBPUSD': { api: 'GBP/USD', nome: 'Libra / Dólar', marketHours: 'Londres + NY' },
    'USDCHF': { api: 'USD/CHF', nome: 'Dólar / Franco', marketHours: 'Londres' },
    'AUDUSD': { api: 'AUD/USD', nome: 'Dólar Australiano / Dólar', marketHours: 'Sydney' },
    'USDCAD': { api: 'USD/CAD', nome: 'Dólar / Canadense', marketHours: 'NY' },
    'NZDUSD': { api: 'NZD/USD', nome: 'Dólar Neozelandês / Dólar', marketHours: 'Sydney' },

    // === Pares cruzados (crosses) ===
    'EURGBP': { api: 'EUR/GBP', nome: 'Euro / Libra', marketHours: 'Londres' },
    'EURCHF': { api: 'EUR/CHF', nome: 'Euro / Franco', marketHours: 'Londres' },
    'GBPJPY': { api: 'GBP/JPY', nome: 'Libra / Iene', marketHours: 'Londres + Tóquio' },
};

/**
 * Extrai a "base" do par (sem barra, sem espaços).
 *   "EUR/USD"  → "EURUSD"
 *   "EURUSD"   → "EURUSD"
 */
function extrairParBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';
    return ticker.toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Retorna símbolo TwelveData + metadados do par.
 */
function getForexSymbol(ticker) {
    const base = extrairParBase(ticker);
    return FOREX_SYMBOLS[base] || null;
}

/**
 * Detecta a sessão atual do Forex (horário de Brasília).
 * Retorna lista de sessões ativas + sobreposição.
 */
function detectarSessaoForex() {
    // Hora em BRT (UTC-3)
    const agora = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const h = agora.getUTCHours();

    const sessoes = [];

    // Sydney: 19h-04h BRT
    if (h >= 19 || h < 4) sessoes.push('Sydney');

    // Tóquio: 21h-06h BRT
    if (h >= 21 || h < 6) sessoes.push('Tóquio');

    // Londres: 04h-13h BRT
    if (h >= 4 && h < 13) sessoes.push('Londres');

    // Nova York: 09h-18h BRT
    if (h >= 9 && h < 18) sessoes.push('Nova York');

    if (sessoes.length === 0) return 'Fora de sessão';
    if (sessoes.length === 1) return sessoes[0];

    return sessoes.join(' + ');
}

module.exports = {
    FOREX_SYMBOLS,
    extrairParBase,
    getForexSymbol,
    detectarSessaoForex,
};