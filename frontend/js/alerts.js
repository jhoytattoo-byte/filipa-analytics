// ============================================================
// ALERTS v6.1 - Notificações e Feed de Alertas (CORRIGIDO)
// ============================================================
// Melhorias:
// - Visual moderno com cards e ícones
// - Categorização por tipo (success, warning, danger, info)
// - Badge de contador não lidos
// - Auto-scroll para novos alertas
// - Som de notificação opcional
// - Persistência no localStorage funcionando
// ============================================================

const Alerts = {
    desktopEnabled: false,
    soundEnabled: true,
    maxAlerts: 100,

    init() {
        console.log('🚨 Alerts v6.1 inicializado');
        this.render();
        this.updateBadge();

        // Escuta eventos do State
        FilipaState.on('alerts', () => {
            this.render();
            this.updateBadge();
            this.playSound();
        });

        // Verificar permissão de notificação
        if ('Notification' in window && Notification.permission === 'default') {
            // Não pede automaticamente, só quando usuário ativar
        }
    },

    add(mensagem, tipo = 'info') {
        // Validar tipo
        const tiposValidos = ['success', 'warning', 'danger', 'info'];
        if (!tiposValidos.includes(tipo)) tipo = 'info';

        // Salvar no State (persiste no localStorage)
        FilipaState.addAlert(mensagem, tipo);

        // Notificação desktop
        if (this.desktopEnabled && Notification.permission === 'granted') {
            new Notification('Filipa Analytics', { 
                body: mensagem,
                icon: 'icon_filipar.PNG'
            });
        }

        // Som
        if (this.soundEnabled) this.playSound(tipo);

        // Atualizar badge na sidebar
        this.updateBadge();
    },

    render() {
        const listEl = document.getElementById('alertsFeed');
        if (!listEl) return;

        const alerts = FilipaState.alerts;

        if (alerts.length === 0) {
            listEl.innerHTML = `
                <div class="empty-state" style="text-align:center; padding:60px 20px; color:#8b9bb5;">
                    <div style="font-size:3rem; margin-bottom:16px; opacity:0.5;">🔔</div>
                    <div style="font-size:1.1rem; margin-bottom:8px;">Nenhum alerta ainda</div>
                    <div style="font-size:0.85rem; opacity:0.7;">Os alertas aparecerão aqui quando houver eventos no sistema</div>
                </div>
            `;
            return;
        }

        listEl.innerHTML = alerts.map((a, index) => {
            const config = this.getAlertConfig(a.tipo);
            const timeAgo = this.timeAgo(a.timestamp);
            const isNew = index === 0;

            return `
            <div class="alert-card ${a.tipo}" style="
                padding:16px 18px;
                background: ${config.bg};
                border: 1px solid ${config.border};
                border-left: 4px solid ${config.color};
                border-radius: 12px;
                margin-bottom: 10px;
                transition: all 0.3s ease;
                animation: ${isNew ? 'slideInRight 0.4s ease' : 'none'};
                position: relative;
                overflow: hidden;
            " onmouseover="this.style.transform='translateX(4px)'" onmouseout="this.style.transform='translateX(0)'">

                ${isNew ? `<div style="position:absolute; top:8px; right:8px; width:8px; height:8px; background:${config.color}; border-radius:50%; animation:pulse 2s infinite;"></div>` : ''}

                <div style="display:flex; align-items:flex-start; gap:12px;">
                    <div style="font-size:1.4rem; flex-shrink:0; margin-top:2px;">${config.icon}</div>
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-size:0.7rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:${config.color};">${config.label}</span>
                            <span style="font-size:0.7rem; color:#6b7a94;">${timeAgo}</span>
                        </div>
                        <div style="color:#e0e6ed; font-size:0.9rem; line-height:1.5; word-break:break-word;">${a.message}</div>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Auto-scroll para o topo (alerta mais recente)
        listEl.scrollTop = 0;
    },

    getAlertConfig(tipo) {
        const configs = {
            success: { 
                icon: '✅', 
                color: '#00ff88', 
                bg: 'rgba(0,255,136,0.05)', 
                border: 'rgba(0,255,136,0.15)',
                label: 'Sucesso'
            },
            warning: { 
                icon: '⚠️', 
                color: '#ffaa00', 
                bg: 'rgba(255,170,0,0.05)', 
                border: 'rgba(255,170,0,0.15)',
                label: 'Aviso'
            },
            danger: { 
                icon: '❌', 
                color: '#ff4444', 
                bg: 'rgba(255,68,68,0.05)', 
                border: 'rgba(255,68,68,0.15)',
                label: 'Erro'
            },
            info: { 
                icon: 'ℹ️', 
                color: '#00bfff', 
                bg: 'rgba(0,191,255,0.05)', 
                border: 'rgba(0,191,255,0.15)',
                label: 'Info'
            }
        };
        return configs[tipo] || configs.info;
    },

    timeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        if (diff < 60000) return 'Agora';
        if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
        if (diff < 86400000) return Math.floor(diff / 3600000) + ' h';
        return Math.floor(diff / 86400000) + ' d';
    },

    updateBadge() {
        // Atualiza badge na sidebar (se existir)
        const badge = document.getElementById('alertsBadge');
        if (badge) {
            const count = FilipaState.alerts.length;
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    playSound(tipo = 'info') {
        // Som sutil de notificação
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const freqs = { success: 600, warning: 450, danger: 350, info: 500 };
            osc.frequency.setValueAtTime(freqs[tipo] || 500, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
            // Audio não disponível, ignora
        }
    },

    toggleDesktop() {
        const checkbox = document.getElementById('desktopAlerts');
        this.desktopEnabled = checkbox?.checked || false;

        if (this.desktopEnabled && Notification.permission !== 'granted') {
            Notification.requestPermission().then(permission => {
                if (permission !== 'granted') {
                    checkbox.checked = false;
                    this.desktopEnabled = false;
                    this.add('Permissão de notificação negada', 'warning');
                }
            });
        }

        // Salvar preferência
        localStorage.setItem('filipa_alerts_desktop', this.desktopEnabled);
    },

    clearAll() {
        if (!confirm('Limpar todos os alertas?')) return;
        FilipaState.alerts = [];
        localStorage.setItem('filipa_alerts', '[]');
        this.render();
        this.updateBadge();
    }
};

// CSS adicional para animações
const alertStyles = document.createElement('style');
alertStyles.textContent = `
    @keyframes slideInRight {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
    .alert-card:hover {
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
`;
document.head.appendChild(alertStyles);

window.Alerts = Alerts;
window.addAlert = (mensagem, tipo) => Alerts.add(mensagem, tipo);

// Inicializar quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
    // Restaurar preferência de desktop
    Alerts.desktopEnabled = localStorage.getItem('filipa_alerts_desktop') === 'true';
    const checkbox = document.getElementById('desktopAlerts');
    if (checkbox) checkbox.checked = Alerts.desktopEnabled;
});