// ============================================================
// TRADING v7.1 - Filipa Coach com Conexao Emocional Completa
// CORRIGIDO: Todas as funções de saudação foram adicionadas
// ============================================================

const Trading = {
    currentFilter: 'all',
    greetingTimer: null,

    // ============================================================
    // INICIALIZAÇÃO
    // ============================================================
    init() {
        this.ensureUser();
        this.updateAllGreetings();
        this.renderTrades();
        this.updateStats();
        this.updateMoodUI();
        this.startLiveGreeting();
        console.log('[Trading] v7.1 inicializado - conexao emocional ativa');
    },

    // ============================================================
    // SAUDAÇÕES (Corrigido: Funções adicionadas)
    // ============================================================
    updateAllGreetings() {
        this.updateGreeting();
        this.updateTopGreeting();
    },

    updateGreeting() {
        const name = this.getUserName();
        const greetingEl = document.getElementById('filipaGreeting');
        const messageEl = document.getElementById('filipaMessage');
        const actionsEl = document.getElementById('filipaActions');
        const h = new Date().getHours();

        let saudacao = 'Bom dia';
        if (h >= 12 && h < 18) saudacao = 'Boa tarde';
        else if (h >= 18) saudacao = 'Boa noite';
        else if (h < 6) saudacao = 'Boa madrugada';

        const variacoes = [
            `${saudacao}, ${name}!`,
            `Oi ${name}!`,
            `Ola, ${name}!`,
            `E ai, ${name}!`,
            `Hey ${name}!`
        ];
        const dia = new Date().getDate();
        const frase = variacoes[dia % variacoes.length];

        if (greetingEl) greetingEl.textContent = frase;
        if (messageEl) messageEl.textContent = '';
        if (actionsEl) actionsEl.innerHTML = '';
    },

    updateTopGreeting() {
        const el = document.getElementById('topGreeting');
        if (el) {
            const hora = new Date().getHours();
            const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
            el.textContent = `${saudacao}, ${this.getUserName()}!`;
        }
    },

    startLiveGreeting() {
        this.updateAllGreetings();
        if (this.greetingTimer) clearInterval(this.greetingTimer);
        this.greetingTimer = setInterval(() => {
            this.updateAllGreetings();
        }, 60000); // Atualiza a cada 60 segundos
    },

    // ============================================================
    // PERSONALIDADE DA FILIPA - Banco de frases emocional
    // ============================================================
    coach: {
        greetings: {
            morning: n => [
                `Bom dia, ${n}! 🌅 O mercado acordou e eu tambem. Vamos juntos?`,
                `Ei ${n}! 🚀 Hoje e seu dia. Ja to de olho nos graficos.`,
                `Ola ${n}! ☕ Cafe pronto? Eu ja analisei a abertura.`,
                `${n}! 🌞 Bem-vindo de volta. Sua banca ta esperando.`,
                `Bom dia, ${n}! 💪 Vamos fazer historia hoje?`
            ],
            afternoon: n => [
                `Boa tarde, ${n}! 🍽️ Almoçou? O mercado nao para.`,
                `Oi ${n}! 👀 To de olho nas oportunidades da tarde.`,
                `E ai ${n}? 🌤️ Sessao europeia ta movimentada.`,
                `Boa tarde, ${n}! 💼 Bora pra mais uma?`,
                `Hey ${n}! 📊 Analisei os pares principais. Quer ver?`
            ],
            evening: n => [
                `Boa noite, ${n}! 🌙 Cuidado com o horario.`,
                `Ei ${n}, ja sao ${new Date().getHours()}h... 😴 Ainda ta ai?`,
                `Boa noite, ${n}! 🌃 Sessao asiatica comeca.`,
                `${n}! 🌜 Ja pensa em descansar? Amanha tem mais.`,
                `Oi ${n}! 🌚 Mercado noturno. Volatilidade baixa.`
            ]
        },

        winMsgs: n => [
            `AEEEE ${n.toUpperCase()}! NA MOSCA! 🎉🎉🎉`,
            `${n}, VOCE E FERA! 🔥🔥🔥`,
            `Isso ai, ${n}! 💪💪💪`,
            `BOA ${n.toUpperCase()}! 🎯 Acertou em cheio!`,
            `${n}! 🚀🚀🚀 To orgulhosa de voce!`,
            `Nossa ${n}! 😍 Voce ta ON FIRE!`,
            `Perfeito ${n}! ⭐⭐⭐ Excelente leitura!`
        ],

        lossMsgs: n => [
            `Poxa, ${n}... faz parte. 📚 Respira.`,
            `${n}, mantenha a gestao! 🛡️ A proxima vem.`,
            `Respira, ${n}. 💪 Amanha volta mais forte.`,
            `${n}... 😔 Perda controlada e aprendizado.`,
            `Fica tranquilo ${n}. 🌱 Cada loss e um degrau pro win.`,
            `Ei ${n}, nao desanima! 🎯 A proxima e nossa.`,
            `${n}, voce ta bem? 🫂 Quer uma pausa?`
        ],

        absenceMsgs: n => [
            `Sumiu, ${n}? 😢 Faz tempo que nao vejo voce.`,
            `${n}! 🥺 Cadê voce? O mercado ta diferente sem voce.`,
            `Oi ${n}! 👋 Bora voltar? To esperando.`,
            `${n}... 😔 Sua cadeira ta vazia. Volta?`,
            `Ei ${n}! 🌈 Senti sua falta. Bora operar?`,
            `${n}! 💫 To aqui, pronta. So falta voce.`,
            `Onde anda voce, ${n}? 🎯 O mercado nao espera.`
        ],

        streakMsgs: (n, count) => [
            `${n}! 🔥🔥🔥 ${count} WINS SEGUIDOS! VOCE E UM MONSTRO!`,
            `INACREDITAVEL ${n.toUpperCase()}! 🚀 ${count} na sequencia!`,
            `${n}! 😍 ${count} wins! To de boca aberta!`,
            `MITO ${n.toUpperCase()}! 💎💎💎 ${count} seguidos!`,
            `${n}! 🏆🏆🏆 ${count} wins! Voce ta no flow!`
        ],

        lossStreakMsgs: (n, count) => [
            `${n}... 🚨 ${count} losses. Pare. Respira.`,
            `Ei ${n}, 🛡️ ${count} seguidos. Da uma pausa?`,
            `${n}! ⚠️ ${count} losses. Gestao emocional agora.`,
            `Calma ${n}. 😔 ${count} nao define voce. Pare.`,
            `${n}, 🛑 ${count} losses. To preocupada. Descanse.`,
            `Forca ${n}! 💪 ${count} e so um numero. Amanha e novo.`,
            `${n}... 🫂 Quer conversar? To aqui.`
        ],

        goalMsgs: n => [
            `META ATINGIDA ${n.toUpperCase()}! 🎉🎉🎉 PARABENS!`,
            `${n}! 🏆 Voce CRUSHOU a meta! Incrível!`,
            `INCRÍVEL ${n}! 🌟 Meta batida com estilo!`,
            `${n}! 🚀🚀🚀 Voce e imparável! Meta atingida!`,
            `PARABENS ${n.toUpperCase()}! 💰💰💰 Meta no bolso!`
        ],

        limitMsgs: n => [
            `${n}! 🚨🚨🚨 LIMITE DE PERDA ATINGIDO! PARE AGORA!`,
            `Ei ${n}, 🛑🛑🛑 Chega por hoje. Proteja sua banca.`,
            `${n}... 😔 Limite atingido. To preocupada. Pare.`,
            `FORCA ${n}! 💪 Amanha e outro dia. Pare agora.`,
            `${n}! 🛡️🛡️🛡️ Sua banca precisa de voce. Descanse.`,
            `Alerta ${n}! ⚠️⚠️⚠️ Limite batido. Proteja-se.`,
            `${n}, 🌙 Ja deu por hoje. To aqui amanha.`,
            `PARE ${n.toUpperCase()}! 🛑 Voce ja perdeu o suficiente.`,
            `Ei ${n}... 💔 To vendo voce sofrendo. Pare.`,
            `${n}! 🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨 LIMITE! PARE! AGORA!`
        ],

        moodAdvice: {
            calm: '😌 Perfeito! Estado ideal. Voce ta no controle.',
            confident: '😤 Confiança é boa, mas nao vire arrogancia!',
            anxious: '😰 ANSIEDADE! Sua taxa cai 40%. Respire fundo!',
            tired: '😴 CANSADO! Considera parar por hoje.',
            frustrated: '😡 FRUSTRAÇÃO! PARE AGORA! Nao force!',
            euphoric: '🤩 EUFORIA! Cuidado com overtrading!'
        },

        getGreeting(name) {
            const h = new Date().getHours();
            let p = 'morning';
            if (h >= 12 && h < 18) p = 'afternoon';
            else if (h >= 18) p = 'evening';
            const msgs = this.greetings[p](name);
            return msgs[Math.floor(Math.random() * msgs.length)];
        },

        getWinMsg(n) { return this.winMsgs(n)[Math.floor(Math.random() * this.winMsgs(n).length)]; },
        getLossMsg(n) { return this.lossMsgs(n)[Math.floor(Math.random() * this.lossMsgs(n).length)]; },
        getAbsenceMsg(n) { return this.absenceMsgs(n)[Math.floor(Math.random() * this.absenceMsgs(n).length)]; },
        getStreakMsg(n, count) { return this.streakMsgs(n, count)[Math.floor(Math.random() * this.streakMsgs(n, count).length)]; },
        getLossStreakMsg(n, count) { return this.lossStreakMsgs(n, count)[Math.floor(Math.random() * this.lossStreakMsgs(n, count).length)]; },
        getGoalMsg(n) { return this.goalMsgs(n)[Math.floor(Math.random() * this.goalMsgs(n).length)]; },
        getLimitMsg(n) { return this.limitMsgs(n)[Math.floor(Math.random() * this.limitMsgs(n).length)]; }
    },

    // ============================================================
    // REGISTRO DO TRADER
    // ============================================================
    ensureUser() {
        let user = JSON.parse(localStorage.getItem('filipa_user') || 'null');
        if (!user || !user.name || user.name === 'Trader') {
            const name = prompt('👋 Ola! Sou a Filipa.\n\nQual o seu nome, trader?') || 'Trader';
            user = {
                name: name.trim(),
                plan: 'free',
                loginDate: new Date().toISOString(),
                firstVisit: new Date().toISOString()
            };
            localStorage.setItem('filipa_user', JSON.stringify(user));
            this.showToast(`🎉 Bem-vindo, ${user.name}! Sou a Filipa, sua parceira de trading.`, 'success');
        }
        FilipaState.user = user;
        return user;
    },

    getUserName() {
        if (window.filipaTraderName && window.filipaTraderName !== 'Trader') {
            return window.filipaTraderName;
        }
        const user = JSON.parse(localStorage.getItem('filipa_user') || '{"name":"Trader"}');
        return user.name || 'Trader';
    },

    // ============================================================
    // TRADES
    // ============================================================
    addTrade(e) {
        e.preventDefault();
        const name = this.getUserName();
        const trade = {
            pair: document.getElementById('tradePair').value,
            direction: document.getElementById('tradeDirection').value,
            result: document.getElementById('tradeResult').value,
            value: parseFloat(document.getElementById('tradeValue').value) || 0,
            timeframe: document.getElementById('tradeTimeframe').value,
            id: Date.now(),
            date: new Date().toISOString()
        };

        const trades = FilipaState.trades;
        trades.unshift(trade);
        FilipaState.trades = trades;

        if (trade.result === 'WIN') {
            this.showToast(this.coach.getWinMsg(name), 'success');
            this.confetti();
        } else {
            this.showToast(this.coach.getLossMsg(name), 'warning');
        }

        document.getElementById('tradeForm').reset();
        this.renderTrades();
        this.updateStats();
        this.updateAllGreetings();
        if (typeof Dashboard !== 'undefined') {
            Dashboard.updateGoals(FilipaState.getStats());
            Dashboard.updateWeeklySummary();
        }
    },

    deleteTrade(id) {
        if (confirm('Excluir este trade?')) {
            let trades = FilipaState.trades;
            trades = trades.filter(t => t.id !== id);
            FilipaState.trades = trades;
            this.renderTrades();
            this.updateStats();
            this.updateAllGreetings();
            if (typeof Dashboard !== 'undefined') {
                Dashboard.updateGoals(FilipaState.getStats());
                Dashboard.updateWeeklySummary();
            }
            this.showToast('Trade removido', 'info');
        }
    },

    renderTrades(filter) {
        if (filter) this.currentFilter = filter;
        let trades = FilipaState.trades;
        if (this.currentFilter === 'win') trades = trades.filter(t => t.result === 'WIN');
        if (this.currentFilter === 'loss') trades = trades.filter(t => t.result === 'LOSS');
        const tbody = document.getElementById('tradesTableBody');
        const empty = document.getElementById('emptyTrades');
        if (!tbody) return;
        if (trades.length === 0) { tbody.innerHTML = ''; if (empty) empty.style.display = 'block'; return; }
        if (empty) empty.style.display = 'none';
        tbody.innerHTML = trades.map(t => {
            const d = new Date(t.date);
            const ds = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
            const rc = t.result === 'WIN' ? 'color:var(--success)' : 'color:var(--error)';
            const ri = t.result === 'WIN' ? '✅' : '❌';
            const di = t.direction === 'COMPRA' ? '📈' : '📉';
            return `<tr class="trade-row ${t.result.toLowerCase()}" style="border-bottom:1px solid rgba(255,255,255,.05)"><td style="padding:10px 8px;color:var(--muted);font-size:.8rem">${ds}</td><td style="padding:10px 8px;font-weight:600">${t.pair}</td><td style="padding:10px 8px">${di}</td><td style="padding:10px 8px;${rc};font-weight:700">${ri} ${t.result}</td><td style="padding:10px 8px;text-align:right">R$ ${t.value.toFixed(2)}</td><td style="padding:10px 8px;color:var(--muted)">${t.timeframe}</td><td style="padding:10px 8px;text-align:center"><button onclick="Trading.deleteTrade(${t.id})" style="background:transparent;border:none;color:var(--error);cursor:pointer;font-size:1rem;opacity:.7">🗑️</button></td></tr>`;
        }).join('');
    },

    filterTrades(f) { this.renderTrades(f); },

    // ============================================================
    // STATS
    // ============================================================
    updateStats() {
        const stats = FilipaState.getStats();
        this.setText('winRateDisplay', stats.winRate + '%');
        this.setText('traderScore', stats.score);
        this.setText('traderLevel', stats.level);
        this.setText('streakDisplay', stats.streak);
        this.setText('tradesCountDisplay', stats.totalTrades);
        const profitEl = document.getElementById('totalProfitDisplay');
        if (profitEl) { profitEl.textContent = 'R$ ' + stats.profit.toFixed(2); profitEl.style.color = stats.profit >= 0 ? 'var(--success)' : 'var(--error)'; }
        const streakEl = document.getElementById('streakDisplay');
        if (streakEl) { streakEl.style.color = stats.streakType === 'WIN' ? 'var(--success)' : stats.streakType === 'LOSS' ? 'var(--error)' : 'var(--muted)'; }
    },

    setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; },

    // ============================================================
    // MOOD
    // ============================================================
    setMood(mood) {
        FilipaState.mood = mood;
        localStorage.setItem('filipa_mood', mood);
        document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
        if (event && event.target) event.target.classList.add('selected');
        const name = this.getUserName();
        const adviceEl = document.getElementById('moodAdvice');
        let advice = this.coach.moodAdvice[mood] || '';
        advice = advice.replace('${n}', name);
        if (adviceEl) {
            const color = (mood === 'anxious' || mood === 'frustrated' || mood === 'tired') ? 'var(--error)' : 'var(--primary)';
            adviceEl.innerHTML = `<span style="color:${color}">${advice}</span>`;
        }
        if (mood === 'frustrated' || mood === 'anxious') {
            this.showToast(`🚨 ${name}, emocao negativa detectada! Faça uma pausa.`, 'warning');
        }
    },

    updateMoodUI() {
        const mood = localStorage.getItem('filipa_mood') || '';
        if (!mood) return;
        const btns = document.querySelectorAll('.mood-btn');
        const map = { calm: 0, confident: 1, anxious: 2, tired: 3, frustrated: 4, euphoric: 5 };
        if (btns[map[mood]]) btns[map[mood]].classList.add('selected');
        const name = this.getUserName();
        const adviceEl = document.getElementById('moodAdvice');
        let advice = this.coach.moodAdvice[mood] || '';
        advice = advice.replace('${n}', name);
        if (adviceEl) {
            const color = (mood === 'anxious' || mood === 'frustrated' || mood === 'tired') ? 'var(--error)' : 'var(--primary)';
            adviceEl.innerHTML = `<span style="color:${color}">${advice}</span>`;
        }
    },

    // ============================================================
    // UTILS
    // ============================================================
    showToast(msg, type) {
        let container = document.getElementById('toastContainer');
        if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
        const toast = document.createElement('div'); toast.className = `toast ${type}`;
        const icon = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';
        toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
    },

    confetti() {
        const colors = ['#00bfff', '#00ff88', '#ffd700', '#ff4444', '#ffaa00'];
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.style.cssText = `position:fixed;width:8px;height:8px;background:${colors[Math.floor(Math.random()*colors.length)]};left:${Math.random()*100}vw;top:-10px;border-radius:50%;z-index:99999;pointer-events:none;`;
                document.body.appendChild(el);
                const dur = 1500 + Math.random() * 1500;
                el.animate([{ transform: 'translateY(0) rotate(0deg)', opacity: 1 }, { transform: `translateY(${window.innerHeight}px) rotate(${Math.random()*720}deg)`, opacity: 0 }], { duration: dur, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' });
                setTimeout(() => el.remove(), dur);
            }, i * 40);
        }
    }
};

window.Trading = Trading;