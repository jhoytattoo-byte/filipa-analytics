// ============================================================
// stocksSymbols.js — Mapeamento de ações dos EUA
// ============================================================
// TwelveData cobre ações EUA no plano grátis. ✅
// ============================================================

const STOCKS_SYMBOLS = {
    // === Magnificent 7 ===
    'AAPL':  { api: 'AAPL',  nome: 'Apple',            marketHours: 'NASDAQ' },
    'MSFT':  { api: 'MSFT',  nome: 'Microsoft',        marketHours: 'NASDAQ' },
    'GOOGL': { api: 'GOOGL', nome: 'Alphabet (Google)',marketHours: 'NASDAQ' },
    'AMZN':  { api: 'AMZN',  nome: 'Amazon',           marketHours: 'NASDAQ' },
    'NVDA':  { api: 'NVDA',  nome: 'Nvidia',           marketHours: 'NASDAQ' },
    'META':  { api: 'META',  nome: 'Meta (Facebook)',  marketHours: 'NASDAQ' },
    'TSLA':  { api: 'TSLA',  nome: 'Tesla',            marketHours: 'NASDAQ' },

    // === Outras tech/IA ===
    'APLD':  { api: 'APLD',  nome: 'Applied Digital',  marketHours: 'NASDAQ' },
    'IREN':  { api: 'IREN',  nome: 'IREN Ltd',         marketHours: 'NASDAQ' },
    'MARA':  { api: 'MARA',  nome: 'Marathon Digital', marketHours: 'NASDAQ' },
    'BNGO':  { api: 'BNGO',  nome: 'Bionano Genomics', marketHours: 'NASDAQ' },
};

/**
 * Extrai o ticker de ação (aceita vários formatos).
 *   "AAPL"      → "AAPL"
 *   "aapl"      → "AAPL"
 *   "AAPL.US"   → "AAPL"
 *   "Apple Inc" → "AAPL"
 */
function extrairStockBase(ticker) {
    if (!ticker || typeof ticker !== 'string') return '';

    // 🔥 Limpeza: remove timeframe, espaços, caracteres estranhos
    // Ex: "AAPL 60Min" → "AAPL", "Apple Inc 1D" → "APPLE"
    const upper = ticker.toUpperCase().trim();

    // Detecta por nome completo primeiro
    const nomesCompletos = {
        'APPLE': 'AAPL',
        'MICROSOFT': 'MSFT',
        'GOOGLE': 'GOOGL',
        'ALPHABET': 'GOOGL',
        'AMAZON': 'AMZN',
        'NVIDIA': 'NVDA',
        'FACEBOOK': 'META',
        'TESLA': 'TSLA',
    };

    for (const [nome, sigla] of Object.entries(nomesCompletos)) {
        if (upper.includes(nome)) return sigla;
    }

    // 🔥 Detecta por sigla (com tolerância a typos comuns)
    const typosComuns = {
        'APPL': 'AAPL',   // Apple digitado errado
        'GOOG': 'GOOGL',  // Google sem L
        'MSFT': 'MSFT',   // ok
        'AMZN': 'AMZN',
        'NVDA': 'NVDA',
        'TSLA': 'TSLA',
        'META': 'META',
        'IREN': 'IREN',
        'MARA': 'MARA',
        'BNGO': 'BNGO',
        'APLD': 'APLD',
    };

    // Tenta por sigla exata primeiro
    const siglas = Object.keys(STOCKS_SYMBOLS);
    for (const sigla of siglas) {
        if (upper.includes(sigla)) return sigla;
    }

    // Tenta por typos comuns
    for (const [typo, sigla] of Object.entries(typosComuns)) {
        if (upper.includes(typo)) return sigla;
    }

    // Fallback: 4 letras iniciais (sem espaços)
    return upper.slice(0, 4).replace(/[^A-Z]/g, '');
}

function getStockSymbol(ticker) {
    const base = extrairStockBase(ticker);
    return STOCKS_SYMBOLS[base] || null;
}

/**
 * Detecta a sessão atual dos EUA (horário de Brasília).
 * - Pré-market:  05h-10h30
 * - Regular:     10h30-17h
 * - After-market: 17h-21h
 * - Fechado:     fora dos horários + fim de semana
 */
function detectarSessaoStocks() {
    const agora = new Date(Date.now() - 3 * 60 * 60 * 1000); // BRT
    const diaSemana = agora.getUTCDay();
    const hora = agora.getUTCHours();
    const minuto = agora.getUTCMinutes();
    const horaDecimal = hora + minuto / 60;

    // Fim de semana
    if (diaSemana === 0 || diaSemana === 6) {
        return 'NYSE/NASDAQ Fechado (Fim de Semana)';
    }

    if (horaDecimal >= 5 && horaDecimal < 10.5) return 'Pré-Market (EUA)';
    if (horaDecimal >= 10.5 && horaDecimal < 17) return 'NYSE/NASDAQ Regular';
    if (horaDecimal >= 17 && horaDecimal < 21) return 'After-Market (EUA)';

    return 'NYSE/NASDAQ Fechado';
}

module.exports = {
    STOCKS_SYMBOLS,
    extrairStockBase,
    getStockSymbol,
    detectarSessaoStocks,
};