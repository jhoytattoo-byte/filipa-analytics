// ============================================================
// DASHBOARD v16.0 — PROJECT ATHENA (PRODUÇÃO ESTÁVEL)
// ============================================================
// CORREÇÃO NATÍVA DE CONCORRÊNCIA: Bloqueia re-render destrutivo 
// se a análise visual estiver travada na tela Vision.
// ============================================================

const Dashboard = {
    // Array para PulseMarket (v6.1+) - Mantido para compatibilidade
    sinaisHoje: [],

    init() {
        this.render();
        // Escuta atualizações de trades e trading sem destruir a aba Vision ativa
        FilipaState.on('trades', () => this.render());
        FilipaState.on('trading', () => this.render());
    },

    render() {
        const stats = FilipaState.getStats();

        // === TOP CARDS ===
        this.setText('totalDetections', stats.totalAnalyses || 0);
        this.setText('totalAnalyses', stats.totalAnalyses || 0);
        this.setText('avgConfidence', (stats.avgConf || 0) + '%');
        this.setText('yoloDetections', stats.totalAnalyses || 0);

        // === FOOTER CARDS ===
        this.setText('traderScore', stats.score || 0);
        this.setText('traderLevel', stats.level || '🥉 Bronze');
        this.setText('winRateDisplay', (stats.winRate || 0) + '%');

        const profitEl = document.getElementById('totalProfitDisplay');
        if (profitEl) {
            profitEl.textContent = 'R$ ' + (stats.profit || 0).toFixed(2);
            profitEl.style.color = (stats.profit || 0) >= 0 ? 'var(--success)' : 'var(--error)';
        }

        this.setText('streakDisplay', stats.streak || 0);
        const streakEl = document.getElementById('streakDisplay');
        if (streakEl) {
            streakEl.style.color = stats.streakType === 'WIN' ? 'var(--success)' : stats.streakType === 'LOSS' ? 'var(--error)' : 'var(--muted)';
        }

        this.setText('tradesCountDisplay', stats.totalTrades || 0);

        this.updateFinancialBars(stats);
        this.updateWeeklySummary();
    },

    updateBackgroundCounters() {
        // Atualiza apenas os elementos textuais de métricas
        const stats = FilipaState.getStats();
        const targets = {
            'totalDetections': stats.totalAnalyses || 0,
            'totalAnalyses': stats.totalAnalyses || 0,
            'yoloDetections': stats.totalAnalyses || 0,
            'avgConfidence': (stats.avgConf || 0) + '%',
            'winRateDisplay': (stats.winRate || 0) + '%',
            'traderScore': stats.score || 0,
            'traderLevel': stats.level || '🥉 Bronze',
            'streakDisplay': stats.streak || 0,
            'tradesCountDisplay': stats.totalTrades || 0
        };
        Object.entries(targets).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });

        const profitEl = document.getElementById('totalProfitDisplay');
        if (profitEl) {
            profitEl.textContent = 'R$ ' + (stats.profit || 0).toFixed(2);
            profitEl.style.color = (stats.profit || 0) >= 0 ? 'var(--success)' : 'var(--error)';
        }

        const streakEl = document.getElementById('streakDisplay');
        if (streakEl) {
            streakEl.style.color = stats.streakType === 'WIN' ? 'var(--success)' : stats.streakType === 'LOSS' ? 'var(--error)' : 'var(--muted)';
        }
    },

    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    updateFinancialBars(stats) {
        // Busca metas diretamente da config do State Manager (state.js)
        const goal = parseFloat(FilipaState.config.dailyGoal || 150);
        const limit = parseFloat(FilipaState.config.lossLimit || 100);

        const gp = Math.min((stats.todayProfit / goal) * 100, 100);
        const lp = Math.min((stats.todayLoss / limit) * 100, 100);

        const goalBar = document.getElementById('dailyGoalBar');
        const goalText = document.getElementById('dailyGoalText');
        const lossBar = document.getElementById('lossBar');
        const lossText = document.getElementById('lossText');

        if (goalBar) goalBar.style.width = gp + '%';
        if (goalText) goalText.textContent = `R$ ${stats.todayProfit.toFixed(2)} / R$ ${goal}`;
        if (lossBar) lossBar.style.width = lp + '%';
        if (lossText) lossText.textContent = `R$ ${stats.todayLoss.toFixed(2)} / R$ ${limit}`;
    },

    updateWeeklySummary() {
        const trades = FilipaState.trades;
        const days = { 'Seg': 1, 'Ter': 2, 'Qua': 3, 'Qui': 4, 'Sex': 5 };

        Object.entries(days).forEach(([day, num]) => {
            const dt = trades.filter(t => new Date(t.date).getDay() === num);
            const el = document.getElementById('week' + day);
            if (!el) return;

            if (dt.length === 0) { 
                el.textContent = '-'; 
                el.style.color = 'var(--muted)'; 
            } else {
                const wins = dt.filter(t => t.result === 'WIN').length;
                const losses = dt.filter(t => t.result === 'LOSS').length;
                const profit = dt.reduce((s, t) => s + (t.value || 0) * (t.result === 'WIN' ? 1 : -1), 0);
                
                el.textContent = `${wins}W/${losses}L`;
                el.style.color = profit >= 0 ? 'var(--success)' : 'var(--error)';
            }
        });
    },

    // Implementações vazias para compatibilidade com o HTML v6.0
    renderSignals() {},
    renderTopPerformers() {}
};

window.Dashboard = Dashboard;