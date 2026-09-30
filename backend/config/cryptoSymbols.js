// ============================================================
// cryptoSymbols.js — Mapeamento de criptomoedas
// ============================================================
// Crypto TEM dados reais (Binance) — plano grátis cobre.
// Mas como o volume é alto, a gente pode validar cruzado.
// ============================================================

const CRYPTO_SYMBOLS = {
    // === Principais (Binance) ===
    'BTC':  { api: 'BTC/USD', nome: 'Bitcoin',  marketHours: '24/7' },
    'ETH':  { api: 'ETH/USD', nome: 'Ethereum', marketHours: '24/7' },
    'SOL':  { api: 'SOL/USD', nome: 'Solana',   marketHours: '24/7' },
    'BNB':  { api: 'BNB/USD', nome: 'Binance Coin', marketHours: '24/7' },
    'XRP':  { api: 'XRP/USD', nome: 'Ripple',   marketHours: '24/7' },
    'DOGE': { api: 'DOGE/USD', nome: 'Dogecoin', marketHours: '24/7' },
    'ADA':  { api: 'ADA/USD', nome: 'Cardano',  marketHours: '24/7' },
    'AVAX': { api: 'AVAX/USD', nome: 'Avalanche', marketHours: '24/7' },
};

function extrairCryptoBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';
    const upper = ticker.toUpperCase().trim();

    // 🔥 1. Detecta por NOME COMPLETO (Solana → SOL, Bitcoin → BTC, etc.)
    const nomesCompletos = {
        'BITCOIN': 'BTC',
        'ETHEREUM': 'ETH',
        'SOLANA': 'SOL',
        'BINANCE': 'BNB',  // BNB ou Binance Coin
        'RIPPLE': 'XRP',
        'DOGECOIN': 'DOGE',
        'CARDANO': 'ADA',
        'AVALANCHE': 'AVAX',
    };

    for (const [nome, sigla] of Object.entries(nomesCompletos)) {
        if (upper.includes(nome)) return sigla;
    }

    // 🔥 2. Detecta por SIGLA (BTC, ETH, SOL, etc.)
    // Aceita sigla em qualquer lugar (com ou sem boundary)
    const siglas = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX'];
    for (const sigla of siglas) {
        if (upper.includes(sigla)) return sigla;
    }

    // Fallback: 3-4 letras iniciais
    return upper.slice(0, 4).replace(/[^A-Z]/g, '');
}

function getCryptoSymbol(ticker) {
    const base = extrairCryptoBase(ticker);
    return CRYPTO_SYMBOLS[base] || null;
}

function detectarSessaoCrypto() {
    return 'Crypto 24/7';
}

module.exports = {
    CRYPTO_SYMBOLS,
    extrairCryptoBase,
    getCryptoSymbol,
    detectarSessaoCrypto,
};