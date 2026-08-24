// ============================================================
// State v7.1 — Estado global do Filipa (CORRIGIDO)
// ============================================================

const FilipaState = {
    // Stats base
    stats: {
        totalDetections: 0,
        totalAnalyses: 0,
        avgConfidence: 0,
        yoloDetections: 0,
        winRate: 0,
        totalProfit: 0,
        streak: 0,
        tradesToday: 0
    },

    // Dados
    trades: JSON.parse(localStorage.getItem('filipa_trades') || '[]'),
    analyses: JSON.parse(localStorage.getItem('filipa_analyses') || '[]'),
    alerts: JSON.parse(localStorage.getItem('filipa_alerts') || '[]'),
    user: JSON.parse(localStorage.getItem('filipa_user') || '{"name":"Trader","plan":"free"}'),
    mood: localStorage.getItem('filipa_mood') || '',
    trading: JSON.parse(localStorage.getItem('filipa_trading') || '{"lossesConsecutivos":0}'),

    // Config
    config: JSON.parse(localStorage.getItem('filipa_config') || '{"apiUrl":"http://127.0.0.1:8001","mode":"development","dailyGoal":150,"lossLimit":100}'),

    // Event system
    _listeners: {},
    on(event, callback) {
        if (!this._listeners[event]) this._listeners[event] = [];
        this._listeners[event].push(callback);
    },
    _emit(event) {
        if (this._listeners[event]) {
            this._listeners[event].forEach(cb => cb());
        }
    },

    // Getters
    getStats() {
        const wins = this.trades.filter(t => t.result === 'WIN').length;
        const losses = this.trades.filter(t => t.result === 'LOSS').length;
        const total = this.trades.length;
        const profit = this.trades.reduce((sum, t) => sum + (t.value || 0) * (t.result === 'WIN' ? 1 : -1), 0);

        // Calcular streak
        let streak = 0, streakType = '';
        for (const t of this.trades) {
            if (streak === 0) { streak = 1; streakType = t.result; }
            else if (t.result === streakType) streak++;
            else break;
        }

        // Hoje
        const today = new Date().toDateString();
        const todayTrades = this.trades.filter(t => new Date(t.date).toDateString() === today);
        const todayProfit = todayTrades.reduce((s, t) => s + (t.value || 0) * (t.result === 'WIN' ? 1 : -1), 0);
        const todayLoss = todayTrades.filter(t => t.result === 'LOSS').reduce((s, t) => s + (t.value || 0), 0);

        // Score e nível
        const score = Math.min(1000, wins * 50 + Math.floor(profit));
        let level = '🥉 Bronze';
        if (score > 200) level = '🥈 Prata';
        if (score > 500) level = '🥇 Ouro';
        if (score > 800) level = '💎 Diamante';

        return {
            totalAnalyses: this.analyses.length,
            avgConf: this.analyses.length > 0 ? Math.round(this.analyses.reduce((s, a) => s + (a.confianca || 0), 0) / this.analyses.length) : 0,
            winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
            score: score,
            level: level,
            streak: streak,
            streakType: streakType,
            totalTrades: total,
            profit: profit,
            todayProfit: todayProfit,
            todayLoss: todayLoss,
            lastAnalysis: this.analyses[0] || null
        };
    },

    // Setters com persistência
    setUser(user) {
        this.user = user;
        localStorage.setItem('filipa_user', JSON.stringify(user));
    },

    setMood(mood) {
        this.mood = mood;
        localStorage.setItem('filipa_mood', mood);
    },

    setTrading(data) {
        this.trading = { ...this.trading, ...data };
        localStorage.setItem('filipa_trading', JSON.stringify(this.trading));
    },

    // Trades
    addTrade(trade) {
        this.trades.unshift(trade);
        localStorage.setItem('filipa_trades', JSON.stringify(this.trades));
        // Atualizar losses consecutivos
        if (trade.result === 'LOSS') {
            this.trading.lossesConsecutivos = (this.trading.lossesConsecutivos || 0) + 1;
        } else {
            this.trading.lossesConsecutivos = 0;
        }
        this.setTrading(this.trading);
        this._emit('trades');
        this._emit('trading');
    },

    // Análises
    addAnalysis(analysis) {
        this.analyses.unshift(analysis);
        localStorage.setItem('filipa_analyses', JSON.stringify(this.analyses));
        this._emit('analyses');
    },

    // Alertas
    addAlert(mensagem, tipo) {
        const alert = { message: mensagem, tipo: tipo, timestamp: Date.now() };
        this.alerts.unshift(alert);
        if (this.alerts.length > 50) this.alerts = this.alerts.slice(0, 50);
        localStorage.setItem('filipa_alerts', JSON.stringify(this.alerts));
        this._emit('alerts');
    }
};

window.FilipaState = FilipaState;