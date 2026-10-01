// ============================================================
// fundsSymbols.js — Mapeamento de FIIs (Fundos Imobiliários)
// ============================================================
// Fonte: Brapi (cobre FIIs no plano grátis, igual B3)
// ============================================================

const FUNDS_SYMBOLS = {
    // === FIIs Papel (renda fixa) ===
    'MXRF11': { api: 'MXRF11', fonte: 'brapi', nome: 'Maxi Renda',     marketHours: 'B3 (10h-18h BRT)', segmento: 'Papel' },
    'HGLG11': { api: 'HGLG11', fonte: 'brapi', nome: 'CSHG Logística', marketHours: 'B3 (10h-18h BRT)', segmento: 'Logística' },
    'VISC11': { api: 'VISC11', fonte: 'brapi', nome: 'Vinci Shopping', marketHours: 'B3 (10h-18h BRT)', segmento: 'Shoppings' },
    'KNRI11': { api: 'KNRI11', fonte: 'brapi', nome: 'Kinea Renda',    marketHours: 'B3 (10h-18h BRT)', segmento: 'Híbrido' },
};

/**
 * Extrai a base do ticker de FII.
 *   "MXRF11"            → "MXRF11"
 *   "MXRF11 (Maxi)"     → "MXRF11"
 *   "Maxi Renda"        → "MXRF11"
 */
function extrairFundBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';
    const upper = ticker.toUpperCase().trim();

    // Detecta por nome completo
    const nomesCompletos = {
        'MAXI RENDA': 'MXRF11',
        'MAXI': 'MXRF11',
        'CSHG LOGISTICA': 'HGLG11',
        'CSHG LOGÍSTICA': 'HGLG11',
        'HGLG': 'HGLG11',
        'VINCI SHOPPING': 'VISC11',
        'VINCI': 'VISC11',
        'KINEA RENDA': 'KNRI11',
        'KINEA': 'KNRI11',
    };

    for (const [nome, sigla] of Object.entries(nomesCompletos)) {
        if (upper.includes(nome)) return sigla;
    }

    // Detecta por ticker exato (MXRF11, HGLG11, etc.)
    const siglas = Object.keys(FUNDS_SYMBOLS);
    for (const sigla of siglas) {
        if (upper.includes(sigla)) return sigla;
    }

    // Detecta padrão [A-Z]{4}11 (padrão de FIIs)
    const fundMatch = upper.match(/\b([A-Z]{4}11)\b/);
    if (fundMatch) return fundMatch[1];

    // Fallback: 6 letras iniciais
    return upper.slice(0, 6).replace(/[^A-Z0-9]/g, '');
}

function getFundSymbol(ticker) {
    const base = extrairFundBase(ticker);
    return FUNDS_SYMBOLS[base] || null;
}

/**
 * Sessão dos FIIs (B3).
 */
function detectarSessaoFunds() {
    const agora = new Date(Date.now() - 3 * 60 * 60 * 1000); // BRT
    const diaSemana = agora.getUTCDay();
    const hora = agora.getUTCHours();

    if (diaSemana === 0 || diaSemana === 6) {
        return 'B3 Fechada (Fim de Semana)';
    }

    if (hora >= 10 && hora < 18) return 'B3 Aberta (10h-18h BRT)';
    if (hora < 10) return 'B3 Fechada (Pré-Abertura)';
    return 'B3 Fechada (Pós-Fechamento)';
}

module.exports = {
    FUNDS_SYMBOLS,
    extrairFundBase,
    getFundSymbol,
    detectarSessaoFunds,
};