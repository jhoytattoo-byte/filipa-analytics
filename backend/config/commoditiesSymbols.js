// ============================================================
// commoditiesSymbols.js — Mapeamento de commodities
// ============================================================
// TwelveData cobre commodities no plano grátis. ✅
// ============================================================

const COMMODITIES_SYMBOLS = {
    // === Metais preciosos ===
    'XAU': { api: 'XAU/USD', nome: 'Ouro',      marketHours: 'Global 24h' },
    'XAG': { api: 'XAG/USD', nome: 'Prata',     marketHours: 'Global 24h' },

    // === Energia ===
    'WTI': { api: 'WTI/USD', nome: 'Petróleo WTI', marketHours: 'NYMEX' },

    // === Metais industriais ===
    'HG':  { api: 'HG',      nome: 'Cobre',     marketHours: 'COMEX' },

    // === Agrícolas ===
    'KC':  { api: 'KC',      nome: 'Café',      marketHours: 'ICE' },
    'ZS':  { api: 'ZS',      nome: 'Soja',      marketHours: 'CBOT' },
    'BGI': { api: 'BGI',     nome: 'Boi Gordo', marketHours: 'B3' },
};

/**
 * Extrai a base do ticker de commodities.
 *   "Ouro (XAU/USD)"  → "XAU"
 *   "XAU/USD"          → "XAU"
 *   "Petróleo (WTI)"   → "WTI"
 *   "WTI"              → "WTI"
 */
function extrairCommodityBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';
    const upper = ticker.toUpperCase().trim();

    // Detecta por nome completo
    const nomesCompletos = {
        'OURO': 'XAU',
        'GOLD': 'XAU',
        'PRATA': 'XAG',
        'SILVER': 'XAG',
        'PETROLEO': 'WTI',
        'PETRÓLEO': 'WTI',
        'OIL': 'WTI',
        'COBRE': 'HG',
        'COPPER': 'HG',
        'CAFE': 'KC',
        'CAFÉ': 'KC',
        'COFFEE': 'KC',
        'SOJA': 'ZS',
        'SOYBEAN': 'ZS',
        'BOI': 'BGI',
    };

    for (const [nome, sigla] of Object.entries(nomesCompletos)) {
        if (upper.includes(nome)) return sigla;
    }

    // Detecta por sigla (XAU, XAG, WTI, etc.)
    const siglas = Object.keys(COMMODITIES_SYMBOLS);
    for (const sigla of siglas) {
        if (upper.includes(sigla)) return sigla;
    }

    // Fallback: 3 letras iniciais
    return upper.slice(0, 3).replace(/[^A-Z]/g, '');
}

function getCommoditySymbol(ticker) {
    const base = extrairCommodityBase(ticker);
    return COMMODITIES_SYMBOLS[base] || null;
}

/**
 * Sessão de commodities.
 * Maioria 24h (metais), com mercados específicos em horários próprios.
 */
function detectarSessaoCommodities() {
    const agora = new Date(Date.now() - 3 * 60 * 60 * 1000); // BRT
    const diaSemana = agora.getUTCDay();
    const hora = agora.getUTCHours();

    // Fim de semana: fechado (exceto cripto-commodities)
    if (diaSemana === 0 || diaSemana === 6) {
        return 'Commodities Fechado (Fim de Semana)';
    }

    if (hora >= 4 && hora < 18) return 'Commodities Europa + EUA';
    if (hora >= 18 || hora < 4) return 'Commodities Ásia + EUA';

    return 'Commodities Global 24h';
}

module.exports = {
    COMMODITIES_SYMBOLS,
    extrairCommodityBase,
    getCommoditySymbol,
    detectarSessaoCommodities,
};