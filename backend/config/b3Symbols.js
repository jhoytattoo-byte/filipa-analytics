// ============================================================
// b3Symbols.js — Mapeamento robusto de tickers B3 → símbolos de API
// ============================================================
// Fonte primária: BRAPI (ações B3 + índices, plano grátis)
// Fallback: TwelveData (Forex, Cripto, EUA)
// ============================================================

const B3_SYMBOLS = {
    // === Mini contratos (BM&F) — cotados em PONTOS ===
    WIN: { api: '^BVSP', fonte: 'brapi', nome: 'Mini Índice', tipo: 'pontos' },
    WDO: { api: 'USDBRL', fonte: 'twelvedata', nome: 'Mini Dólar', tipo: 'pontos' },
    IND: { api: '^BVSP', fonte: 'brapi', nome: 'Índice Cheio', tipo: 'pontos' },
    DOL: { api: 'USDBRL', fonte: 'twelvedata', nome: 'Dólar Cheio', tipo: 'pontos' },

    // === Micro cripto (B3) — cotados em PONTOS ===
    BIT: { api: 'BTC/USD', fonte: 'twelvedata', nome: 'Micro Bitcoin', tipo: 'pontos' },
    ETH: { api: 'ETH/USD', fonte: 'twelvedata', nome: 'Micro Ethereum', tipo: 'pontos' },
    SOL: { api: 'SOL/USD', fonte: 'twelvedata', nome: 'Micro Solana', tipo: 'pontos' },

    // === Commodities (B3) ===
    GLD: { api: 'XAU/USD', fonte: 'twelvedata', nome: 'Mini Ouro', tipo: 'pontos' },
    BGI: { api: 'BGI', fonte: 'twelvedata', nome: 'Boi Gordo', tipo: 'pontos' },

    // === Ações B3 (blue chips) — cotadas em R$ (DECIMAL) ===
    PETR: { api: 'PETR4', fonte: 'brapi', nome: 'Petrobras', tipo: 'decimal' },
    VALE: { api: 'VALE3', fonte: 'brapi', nome: 'Vale', tipo: 'decimal' },
    ITUB: { api: 'ITUB4', fonte: 'brapi', nome: 'Itaú', tipo: 'decimal' },
    BBAS: { api: 'BBAS3', fonte: 'brapi', nome: 'Banco do Brasil', tipo: 'decimal' },
    BBDC: { api: 'BBDC4', fonte: 'brapi', nome: 'Bradesco', tipo: 'decimal' },
    ABEV: { api: 'ABEV3', fonte: 'brapi', nome: 'Ambev', tipo: 'decimal' },
    B3SA: { api: 'B3SA3', fonte: 'brapi', nome: 'B3', tipo: 'decimal' },
    WEGE: { api: 'WEGE3', fonte: 'brapi', nome: 'WEG', tipo: 'decimal' },
    MGLU: { api: 'MGLU3', fonte: 'brapi', nome: 'Magazine Luiza', tipo: 'decimal' }
};

function extrairAtivoBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';
    const upper = ticker.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

    const candidatos = [
        upper.slice(0, 4),
        upper.slice(0, 3),
        upper.slice(0, 2),
    ];

    for (const c of candidatos) {
        if (B3_SYMBOLS[c]) return c;
    }
    return candidatos[0];
}

function getB3Symbol(ticker) {
    const base = extrairAtivoBase(ticker);
    return B3_SYMBOLS[base] || null;
}

module.exports = {
    B3_SYMBOLS,
    extrairAtivoBase,
    getB3Symbol
};