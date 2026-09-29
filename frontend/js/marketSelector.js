// ============================================================
// marketSelector.js — v1.0
// Cascata: Categoria → Ativo
// ============================================================
// Este arquivo transforma o <select id="marketType"> em cascata.
// O backend NÃO muda: o value enviado continua sendo b3_win, forex_eurusd, etc.
// ============================================================

(function() {
    'use strict';

    // ============================================================
    // MAPA DE CATEGORIAS → ATIVOS
    // Copiado exatamente do <select> antigo, sem alterar nenhum value
    // ============================================================
    const MARKET_DATA = {
        b3: [
            { value: 'b3_win',    label: '📈 B3: Mini Índice (WIN)' },
            { value: 'b3_wdo',    label: '💵 B3: Mini Dólar (WDO)' },
            { value: 'b3_bit',    label: '₿ B3: Micro Bitcoin (BIT)' },
            { value: 'b3_eth',    label: '⟠ B3: Micro Ethereum (ETH)' },
            { value: 'b3_sol',    label: '🟣 B3: Micro Solana (SOL)' },
            { value: 'b3_gld',    label: '🥇 B3: Ouro (GLD)' },
            { value: 'b3_petr4',  label: '🛢️ B3: Petrobras (PETR4)' },
            { value: 'b3_vale3',  label: '⛏️ B3: Vale (VALE3)' },
            { value: 'b3_itub4',  label: '🏦 B3: Itaú (ITUB4)' }
        ],
        forex: [
            { value: 'forex_eurusd', label: '💶 EUR/USD (Euro/Dólar)' },
            { value: 'forex_usdjpy', label: '💴 USD/JPY (Dólar/Iene)' },
            { value: 'forex_gbpusd', label: '💷 GBP/USD (Libra/Dólar)' },
            { value: 'forex_usdchf', label: '🇨🇭 USD/CHF (Dólar/Franco)' },
            { value: 'forex_audusd', label: '🇦🇺 AUD/USD (Dólar Australiano)' },
            { value: 'forex_usdcad', label: '🇨🇦 USD/CAD (Dólar/Canadense)' },
            { value: 'forex_nzdusd', label: '🇳🇿 NZD/USD (Dólar Neozelandês)' },
            { value: 'forex_eurgbp', label: '💶 EUR/GBP (Euro/Libra)' },
            { value: 'forex_eurchf', label: '💶 EUR/CHF (Euro/Franco)' },
            { value: 'forex_gbpjpy', label: '💷 GBP/JPY (Libra/Iene)' }
        ],
        otc: [
            { value: 'otc',         label: '🎰 OTC (Corretora) - Turbo 5s' },
            { value: 'otc_1m',      label: '🎰 OTC - 1 Minuto' },
            { value: 'otc_5m',      label: '🎰 OTC - 5 Minutos' },
            { value: 'otc_eurusd',  label: '💶 EUR/USD OTC' },
            { value: 'otc_gbpusd',  label: '💷 GBP/USD OTC' },
            { value: 'otc_tsla',    label: '🚗 Tesla OTC' },
            { value: 'otc_aapl',    label: '🍎 Apple OTC' }
        ],
        commodities: [
            { value: 'commodities_gold',    label: '🥇 Ouro (XAU/USD)' },
            { value: 'commodities_oil',     label: '🛢️ Petróleo (WTI)' },
            { value: 'commodities_silver',  label: '🥈 Prata (XAG/USD)' },
            { value: 'commodities_copper',  label: '🔶 Cobre (HG)' },
            { value: 'commodities_coffee',  label: '☕ Café (KC)' },
            { value: 'commodities_soybean', label: '🌱 Soja (ZS)' },
            { value: 'commodities_boi',     label: '🐂 Boi Gordo (BGI)' }
        ],
        stocks: [
            { value: 'stocks_aapl', label: '🍎 Apple (AAPL)' },
            { value: 'stocks_tsla', label: '🚗 Tesla (TSLA)' },
            { value: 'stocks_nvda', label: '🖥️ Nvidia (NVDA)' },
            { value: 'stocks_msft', label: '💻 Microsoft (MSFT)' },
            { value: 'stocks_amzn', label: '📦 Amazon (AMZN)' },
            { value: 'stocks_googl',label: '🔍 Alphabet (GOOGL)' },
            { value: 'stocks_meta', label: '👤 Meta (META)' },
            { value: 'stocks_apld', label: '⚡ Applied Digital (APLD)' },
            { value: 'stocks_iren', label: '🔗 IREN Ltd (IREN)' },
            { value: 'stocks_mara', label: '⛏️ Marathon Digital (MARA)' },
            { value: 'stocks_bngo', label: '🧬 Bionano Genomics (BNGO)' }
        ],
        crypto: [
            { value: 'crypto_btc',  label: '₿ Bitcoin (BTC)' },
            { value: 'crypto_eth',  label: '⟠ Ethereum (ETH)' },
            { value: 'crypto_sol',  label: '🟣 Solana (SOL)' },
            { value: 'crypto_bnb',  label: '🟡 Binance Coin (BNB)' },
            { value: 'crypto_xrp',  label: '💧 Ripple (XRP)' },
            { value: 'crypto_doge', label: '🐕 Dogecoin (DOGE)' },
            { value: 'crypto_ada',  label: '🔷 Cardano (ADA)' },
            { value: 'crypto_avax', label: '🔺 Avalanche (AVAX)' }
        ],
        indices: [
            { value: 'indices_ibov',     label: '🇧🇷 IBOV (Bovespa)' },
            { value: 'indices_sp500',    label: '🇺🇸 S&P 500' },
            { value: 'indices_nasdaq',   label: '🇺🇸 Nasdaq 100' },
            { value: 'indices_dow',      label: '🇺🇸 Dow Jones' },
            { value: 'indices_dax',      label: '🇩🇪 DAX (Alemanha)' },
            { value: 'indices_ftse',     label: '🇬🇧 FTSE 100 (Inglaterra)' },
            { value: 'indices_nikkei',   label: '🇯🇵 Nikkei 225 (Japão)' },
            { value: 'indices_hangseng', label: '🇭🇰 Hang Seng (Hong Kong)' }
        ],
        funds: [
            { value: 'funds_mxrf11', label: '🏢 MXRF11 (Maxi Renda)' },
            { value: 'funds_hglg11', label: '🏢 HGLG11 (CSHG Logística)' },
            { value: 'funds_visc11', label: '🏢 VISC11 (Vinci Shopping)' },
            { value: 'funds_knri11', label: '🏢 KNI11 (Kinea Renda)' }
        ]
    };

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    function init() {
        const categorySelect = document.getElementById('marketCategory');
        const wrapper = document.getElementById('marketTypeWrapper');
        const typeSelect = document.getElementById('marketType');

        if (!categorySelect || !wrapper || !typeSelect) {
            console.warn('[MarketSelector] Elementos não encontrados. Abortando.');
            return;
        }

        // Ao trocar a categoria, popula o select de ativos
        categorySelect.addEventListener('change', () => {
            const cat = categorySelect.value;

            if (!cat || !MARKET_DATA[cat]) {
                wrapper.style.display = 'none';
                typeSelect.innerHTML = '';
                return;
            }

            // Popula com os ativos da categoria (1º já vem pré-selecionado)
            typeSelect.innerHTML = MARKET_DATA[cat]
                .map(opt => `<option value="${opt.value}">${opt.label}</option>`)
                .join('');

            // Mostra o 2º select
            wrapper.style.display = 'block';

            // Log de diagnóstico
            console.log(`[MarketSelector] Categoria "${cat}" → ${MARKET_DATA[cat].length} ativos, default: ${typeSelect.value}`);
        });

        console.log('[MarketSelector] Inicializado. Aguardando escolha de categoria.');
    }

    // Espera o DOM carregar (funciona mesmo se o script for carregado antes)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();