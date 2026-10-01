// ============================================================
// indicesSymbols.js — Mapeamento de índices globais
// ============================================================
// Fonte: Yahoo Finance (grátis, cobre TODOS os índices)
// TwelveData plano free NÃO cobre índices globais.
// ============================================================

const INDICES_SYMBOLS = {
    // === Américas ===
    'IBOV':   { api: '^BVSP', nome: 'Ibovespa',     marketHours: 'B3 (10h-18h BRT)', regiao: 'América' },
    'SP500':  { api: '^GSPC', nome: 'S&P 500',      marketHours: 'NYSE (10h30-17h BRT)', regiao: 'América' },
    'NDX':    { api: '^NDX',  nome: 'Nasdaq 100',   marketHours: 'NASDAQ (10h30-17h BRT)', regiao: 'América' },
    'DJI':    { api: '^DJI',  nome: 'Dow Jones',    marketHours: 'NYSE (10h30-17h BRT)', regiao: 'América' },

    // === Europa ===
    'DAX':    { api: '^GDAXI', nome: 'DAX (Alemanha)', marketHours: 'XETRA (04h-13h BRT)', regiao: 'Europa' },
    'FTSE':   { api: '^FTSE',  nome: 'FTSE 100 (Inglaterra)', marketHours: 'LSE (05h-12h BRT)', regiao: 'Europa' },

    // === Ásia ===
    'NIKKEI': { api: '^N225', nome: 'Nikkei 225 (Japão)', marketHours: 'Tóquio (21h-03h BRT)', regiao: 'Ásia' },
    'HSI':    { api: '^HSI',  nome: 'Hang Seng (Hong Kong)', marketHours: 'HKSE (22h-05h BRT)', regiao: 'Ásia' },
};

/**
 * Extrai a "base" do ticker de índice.
 *   "Hang Seng (Hong Kong)"  → "HSI"
 *   "^HSI"                    → "HSI"
 *   "HK50"                    → "HSI"
 *   "IBOV"                    → "IBOV"
 *   "S&P 500"                 → "SP500"
 */
function extrairIndiceBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';
    const upper = ticker.toUpperCase().trim();

    // ============================================================
    // 🔥 Tolerâncias extras (antes dos nomes completos)
    // ============================================================
    // Detecta HK*50 (HK50, HKX50, HK-50, etc.) → Hang Seng
    if (/HK[A-Z]?\s*-?\s*50/i.test(upper)) return 'HSI';

    // Detecta "Hang Seng" ou "HANGSENG" colado
    if (upper.includes('HANGSENG')) return 'HSI';

    // ============================================================
    // Detecta por nome completo
    // ============================================================
    const nomesCompletos = {
        'IBOVESPA': 'IBOV',
        'BOVESPA': 'IBOV',
        'S&P 500': 'SP500',
        'S&P500': 'SP500',
        'SP500': 'SP500',
        'NASDAQ': 'NDX',
        'DOW': 'DJI',
        'DOW JONES': 'DJI',
        'DAX': 'DAX',
        'FTSE': 'FTSE',
        'NIKKEI': 'NIKKEI',
        'HANG SENG': 'HSI',
        'HANG': 'HSI',
    };

    for (const [nome, sigla] of Object.entries(nomesCompletos)) {
        if (upper.includes(nome)) return sigla;
    }

    // ============================================================
    // Detecta por sigla direta (^HSI, ^N225, etc.)
    // ============================================================
    const siglas = ['IBOV', 'SP500', 'NDX', 'DJI', 'DAX', 'FTSE', 'NIKKEI', 'HSI'];
    for (const sigla of siglas) {
        if (upper.includes(sigla)) return sigla;
    }

    // ============================================================
    // Detecta símbolo Yahoo (^GSPC, ^BVSP, ^HSI, etc.)
    // ============================================================
    const yahooMatch = upper.match(/\^(GSPC|NDX|DJI|GDAXI|FTSE|N225|HSI|BVSP)/);
    if (yahooMatch) {
        const mapaYahoo = {
            'BVSP':  'IBOV',
            'GSPC':  'SP500',
            'NDX':   'NDX',
            'DJI':   'DJI',
            'GDAXI': 'DAX',
            'FTSE':  'FTSE',
            'N225':  'NIKKEI',
            'HSI':   'HSI',
        };
        return mapaYahoo[yahooMatch[1]] || '';
    }

    // ============================================================
    // Fallback: 5 letras iniciais
    // ============================================================
    return upper.slice(0, 5).replace(/[^A-Z]/g, '');
}

function getIndiceSymbol(ticker) {
    const base = extrairIndiceBase(ticker);
    return INDICES_SYMBOLS[base] || null;
}

/**
 * Detecta a sessão do índice no momento atual (horário de Brasília).
 * Retorna a sessão do índice detectado.
 */
function detectarSessaoIndice(ticker) {
    const info = getIndiceSymbol(ticker);
    if (info && info.regiao) {
        return `${info.regiao} (${info.marketHours})`;
    }
    return 'Índice Global (horário depende da bolsa)';
}

module.exports = {
    INDICES_SYMBOLS,
    extrairIndiceBase,
    getIndiceSymbol,
    detectarSessaoIndice,
};