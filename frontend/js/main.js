// ============================================================
// MAIN.JS — FILIPA v14.4b
// Navegacao das abas + inicializacao global + conexao emocional
// CORRECOES: Admin adicionado ao titles, atalho Ctrl+1-8, 
// verificacao opcional de email admin
// ============================================================

const FilipaApp = {
    init() {
        this.initNavigation();
        this.initKeyboardShortcuts();
        this.initTradingConnection();
        console.log('FilipaApp v14.4b inicializado - conexao emocional ativa');
    },

    // NAVEGACAO DAS ABAS — CORRIGIDO v14.4b
    initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const panes = document.querySelectorAll('.content-pane');
        const pageTitle = document.getElementById('pageTitle');

        if (navItems.length === 0) {
            console.warn('Nenhum .nav-item encontrado');
            return;
        }

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const paneId = item.getAttribute('data-pane');
                if (!paneId) return;

                // VERIFICACAO ADMIN (opcional - descomente se quiser proteger)
                // if (paneId === 'admin') {
                //     const adminEmails = ['seu-email@exemplo.com'];
                //     const currentUser = window.filipaTraderEmail || '';
                //     if (!adminEmails.includes(currentUser)) {
                //         alert('Acesso restrito a administradores.');
                //         return;
                //     }
                // }

                // Remover active de todos os nav-items
                navItems.forEach(n => n.classList.remove('active'));
                // Remover active de todos os panes
                panes.forEach(p => {
                    p.classList.remove('active');
                    p.style.display = 'none';
                });

                // Adicionar active no clicado
                item.classList.add('active');

                // Ativar pane correspondente
                const targetPane = document.getElementById(paneId + 'Pane');
                if (targetPane) {
                    targetPane.classList.add('active');
                    targetPane.style.display = 'block';
                }

                // Atualizar titulo da pagina
                if (pageTitle) {
                    const titles = {
                        'dashboard': '🏛️ Command Center',
                        'vision': '👁️ Vision Engine',
                        'stream': '📡 Live Feed',
                        'trading': '🌍 Market Pulse',
                        'detections': '🧠 Intelligence',
                        'alerts': '🚨 Alerts',
                        'config': '⚙️ Core Settings',
                        'tutorial': '📘 Tutorial',
                        'admin': '🔐 Admin Center'
                    };
                    pageTitle.textContent = titles[paneId] || 'FILIPA';
                }

                // Atualizar saudacao quando voltar pro trading ou dashboard
                if (typeof Trading !== 'undefined') {
                    if (paneId === 'trading') {
                        Trading.updateGreeting();
                    }
                    if (paneId === 'dashboard') {
                        Trading.updateTopGreeting();
                    }
                }

                console.log(`Aba ativada: ${paneId}`);
            });
        });

        // Ativar primeira aba por padrao (dashboard)
        const dashboardNav = document.querySelector('[data-pane="dashboard"]');
        if (dashboardNav) dashboardNav.click();
    },

    // Inicializa conexao emocional com o trader
    initTradingConnection() {
        // Espera todos os scripts carregarem
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._startTrading());
        } else {
            this._startTrading();
        }
    },

    _startTrading() {
        // Pequeno delay para garantir que state.js e trading.js carregaram
        setTimeout(() => {
            if (typeof Trading !== 'undefined' && Trading.init) {
                Trading.init();
                console.log('[Main] Trading.init() chamado - conexao emocional ativa');
            } else {
                console.warn('[Main] Trading nao disponivel ainda, tentando novamente...');
                setTimeout(() => this._startTrading(), 500);
            }
        }, 100);
    },

    // Atalhos de teclado
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+1 a Ctrl+8 para navegar entre abas (8 abas agora)
            if (e.ctrlKey && e.key >= '1' && e.key <= '8') {
                e.preventDefault();
                const index = parseInt(e.key) - 1;
                const navItems = document.querySelectorAll('.nav-item');
                if (navItems[index]) navItems[index].click();
            }
        });
    },

    // Navegacao programatica
    navigateTo(paneId) {
        const navItem = document.querySelector(`[data-pane="${paneId}"]`);
        if (navItem) navItem.click();
    }
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    FilipaApp.init();

    // Inicializa Dashboard
    if (typeof Dashboard !== 'undefined' && Dashboard.init) {
        Dashboard.init();
    }
});

window.FilipaApp = FilipaApp;
window.Main = FilipaApp; // Alias para compatibilidade