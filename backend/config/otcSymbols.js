// ============================================================
// otcSymbols.js — Mapeamento de ativos OTC
// ============================================================
// OTC (Opções Binárias) NÃO tem fonte de dados real em APIs públicas.
// Os preços vêm da própria corretora (não de mercado).
//
// Este arquivo serve pra:
// 1. Identificar os tipos de OTC (1m, 5m, Turbo, etc.)
// 2. Definir a sessão correta (mercado 24h)
// 3. Não usar validação cruzada (não tem fonte pra validar)
// ============================================================

const OTC_SYMBOLS = {
    // OTC de moedas
    'OTC_EURUSD': { api: null, nome: 'EUR/USD OTC', sessao: 'Global 24h' },
    'OTC_GBPUSD': { api: null, nome: 'GBP/USD OTC', sessao: 'Global 24h' },
    'OTC_USDJPY': { api: null, nome: 'USD/JPY OTC', sessao: 'Global 24h' },

    // OTC de ações
    'OTC_TSLA': { api: null, nome: 'Tesla OTC', sessao: 'Global 24h' },
    'OTC_AAPL': { api: null, nome: 'Apple OTC', sessao: 'Global 24h' },

    // OTC temporais (turbo, 1m, 5m)
    'OTC_1M': { api: null, nome: 'OTC 1 Minuto', sessao: 'Global 24h' },
    'OTC_5M': { api: null, nome: 'OTC 5 Minutos', sessao: 'Global 24h' },
    'OTC_TURBO': { api: null, nome: 'OTC Turbo 5s', sessao: 'Global 24h' },
};

/**
 * Extrai a "base" do ativo OTC.
 *   "EUR/USD OTC" → "OTC_EURUSD"
 *   "OTC - 1 Minuto" → "OTC_1M"
 *   "OTC" → "OTC_TURBO"
 */
function extrairOTCBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';

    const upper = ticker.toUpperCase().trim();

    // Detecta "1 MINUTO" / "5 MINUTOS"
    if (upper.includes('1 MIN')) return 'OTC_1M';
    if (upper.includes('5 MIN')) return 'OTC_5M';
    if (upper.includes('TURBO')) return 'OTC_TURBO';

    // Detecta pares de moeda (EUR/USD OTC → OTC_EURUSD)
    const moedaMatch = upper.match(/([A-Z]{3})\s*\/\s*([A-Z]{3})/);
    if (moedaMatch) return `OTC_${moedaMatch[1]}${moedaMatch[2]}`;

    // Detecta ação (Tesla OTC → OTC_TSLA)
    if (upper.includes('TESLA')) return 'OTC_TSLA';
    if (upper.includes('APPLE')) return 'OTC_AAPL';

    return 'OTC_TURBO';
}

/**
 * Retorna os metadados do ativo OTC.
 */
function getOTCSymbol(ticker) {
    const base = extrairOTCBase(ticker);
    return OTC_SYMBOLS[base] || OTC_SYMBOLS['OTC_TURBO'];
}

/**
 * Sessão do OTC.
 * OTC é 24h (mercado de opções binárias), exceto fim de semana.
 */
function detectarSessaoOTC() {
    const agora = new Date(Date.now() - 3 * 60 * 60 * 1000); // BRT
    const diaSemana = agora.getUTCDay();

    // Fim de semana: 0=Dom, 6=Sáb
    if (diaSemana === 0 || diaSemana === 6) {
        return 'OTC Fim de Semana';
    }

    return 'OTC Global 24h';
}

module.exports = {
    OTC_SYMBOLS,
    extrairOTCBase,
    getOTCSymbol,
    detectarSessaoOTC,
};