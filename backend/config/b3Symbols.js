// ============================================================
// b3Symbols.js — Mapeamento robusto de tickers B3 → símbolos de API
// ============================================================
// Aceita tickers COM vencimento (WINV26, WDOV26, PETR4) e devolve
// o símbolo certo pro TwelveData/Polygon.
// ============================================================

const B3_SYMBOLS = {
    // === Mini contratos (BM&F) — cotados em PONTOS ===
    WIN: { api: '^BVSP', nome: 'Mini Índice', tipo: 'pontos' },
    WDO: { api: 'USDBRL', nome: 'Mini Dólar', tipo: 'pontos' },
    IND: { api: '^BVSP', nome: 'Índice Cheio', tipo: 'pontos' },
    DOL: { api: 'USDBRL', nome: 'Dólar Cheio', tipo: 'pontos' },

    // === Micro cripto (B3) — cotados em PONTOS ===
    BIT: { api: 'BTCUSD', nome: 'Micro Bitcoin', tipo: 'pontos' },
    ETH: { api: 'ETHUSD', nome: 'Micro Ethereum', tipo: 'pontos' },
    SOL: { api: 'SOLUSD', nome: 'Micro Solana', tipo: 'pontos' },

    // === Commodities (B3) ===
    GLD: { api: 'XAUUSD', nome: 'Mini Ouro', tipo: 'pontos' },
    BGI: { api: 'BGI', nome: 'Boi Gordo', tipo: 'pontos' },

    // === Ações B3 (blue chips) — cotadas em R$ (DECIMAL) ===
    PETR: { api: 'PETR4', nome: 'Petrobras', tipo: 'decimal' },
    VALE: { api: 'VALE3', nome: 'Vale', tipo: 'decimal' },
    ITUB: { api: 'ITUB4', nome: 'Itaú', tipo: 'decimal' },
    BBAS: { api: 'BBAS3', nome: 'Banco do Brasil', tipo: 'decimal' },
    BBDC: { api: 'BBDC4', nome: 'Bradesco', tipo: 'decimal' },
    ABEV: { api: 'ABEV3', nome: 'Ambev', tipo: 'decimal' },
    B3SA: { api: 'B3SA3', nome: 'B3', tipo: 'decimal' },
    WEGE: { api: 'WEGE3', nome: 'WEG', tipo: 'decimal' },
    MGLU: { api: 'MGLU3', nome: 'Magazine Luiza', tipo: 'decimal' }
};

/**
 * Extrai a "base" do ticker, removendo vencimento e série.
 *   "WINV26" → "WIN"
 *   "PETR4"  → "PETR"
 *   "WIN"    → "WIN"
 */
function extrairAtivoBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';
    const upper = ticker.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

    // Estratégia: tenta 4 letras, depois 3 letras.
    // Retorna o que BATER no dicionário (B3_SYMBOLS).
    // Se nenhum bater, retorna as 4 primeiras letras (fallback).
    const candidatos = [
        upper.slice(0, 4),  // "WINV26" → "WINV", "PETR4" → "PETR"
        upper.slice(0, 3),  // "WINV26" → "WIN",  "PETR4" → "PET"
        upper.slice(0, 2),  // "WDO..." → "WD" (fallback raro)
    ];

    for (const c of candidatos) {
        if (B3_SYMBOLS[c]) return c;  // ✅ achou no dicionário
    }

    return candidatos[0];  // fallback: 4 primeiras letras
}

/**
 * Retorna o símbolo de API + metadados pra um ticker B3.
 * Retorna null se não for reconhecido.
 */
function getB3Symbol(ticker) {
    const base = extrairAtivoBase(ticker);
    return B3_SYMBOLS[base] || null;
}

module.exports = {
    B3_SYMBOLS,
    extrairAtivoBase,
    getB3Symbol
};