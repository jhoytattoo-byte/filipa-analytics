// ============================================================
// CONFIG v6.1 — Configurações do Filipa (PRODUÇÃO - RENDER)
// ============================================================
// Correções aplicadas:
// - Todas as URLs de fallback agora apontam para o Render
// - Removidas referências hardcodeadas a localhost (127.0.0.1 / 3000)
// - Endpoint de health padronizado para /health (igual ao api.js)
// - Modo padrão alterado para 'production'
// ============================================================

function initConfig() {
    console.log('⚙️ Inicializando Config v6.1 (Produção)...');
    loadConfigValues();
    setupEventListeners();
    checkYOLOStatus();
    // Atualizar status a cada 10s
    setInterval(checkYOLOStatus, 10000);
}

function loadConfigValues() {
    const config = FilipaState.config;
    
    // API URL (readonly display) - Fallback seguro para o Render
    const apiUrlDisplay = document.getElementById('apiUrlDisplay');
    const correctApiUrl = config.apiUrl || 'https://filipa-analytics.onrender.com';
    if (apiUrlDisplay) apiUrlDisplay.textContent = correctApiUrl;

    // Modo (padrão produção)
    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) modeSelect.value = config.mode || 'production';

    // YOLO Status
    updateYOLOStatus('Detectando...', 'checking');

    // Carregar configurações adicionais do localStorage
    const extraConfig = JSON.parse(localStorage.getItem('filipa_extra_config') || '{}');

    // Meta diária
    const dailyGoalInput = document.getElementById('configDailyGoal');
    if (dailyGoalInput) dailyGoalInput.value = extraConfig.dailyGoal || config.dailyGoal || 150;

    // Limite perda
    const lossLimitInput = document.getElementById('configLossLimit');
    if (lossLimitInput) lossLimitInput.value = extraConfig.lossLimit || config.lossLimit || 100;

    // Stop Loss padrão (%)
    const defaultSL = document.getElementById('configDefaultSL');
    if (defaultSL) defaultSL.value = extraConfig.defaultSL || 2;

    // Take Profit padrão (%)
    const defaultTP = document.getElementById('configDefaultTP');
    if (defaultTP) defaultTP.value = extraConfig.defaultTP || 3;

    // Risco por trade (%)
    const riskPerTrade = document.getElementById('configRiskPerTrade');
    if (riskPerTrade) riskPerTrade.value = extraConfig.riskPerTrade || 2;

    // Confianca mínima
    const minConfidence = document.getElementById('configMinConfidence');
    if (minConfidence) minConfidence.value = extraConfig.minConfidence || 60;

    // Notificações desktop
    const desktopAlerts = document.getElementById('desktopAlerts');
    if (desktopAlerts) desktopAlerts.checked = localStorage.getItem('filipa_alerts_desktop') === 'true';

    // Som
    const soundEnabled = document.getElementById('configSound');
    if (soundEnabled) soundEnabled.checked = extraConfig.soundEnabled !== false;

    // Auto-trade
    const autoTrade = document.getElementById('configAutoTrade');
    if (autoTrade) autoTrade.checked = extraConfig.autoTrade || false;
}

function setupEventListeners() {
    // Botão Verificar
    const verifyBtn = document.querySelector('.config-btn[onclick*="checkStatus"]');
    if (verifyBtn) {
        verifyBtn.onclick = async () => {
            await checkAPIStatus();
        };
    }

    // Botão Reconectar
    const reconnectBtn = document.querySelector('.config-btn[onclick*="Reconectar"]');
    if (reconnectBtn) {
        reconnectBtn.onclick = () => {
            reconnectAPI();
        };
    }

    // Botão Salvar
    const saveBtn = document.querySelector('.config-btn[onclick*="Salvar"]');
    if (saveBtn) {
        saveBtn.onclick = () => {
            saveAllConfig();
        };
    }

    // Notificações desktop
    const desktopAlerts = document.getElementById('desktopAlerts');
    if (desktopAlerts) {
        desktopAlerts.addEventListener('change', () => {
            Alerts.toggleDesktop();
        });
    }
}

async function checkAPIStatus() {
    const apiUrlDisplay = document.getElementById('apiUrlDisplay');
    // Fallback seguro para o Render
    const url = apiUrlDisplay?.textContent?.trim() || 'https://filipa-analytics.onrender.com';
    
    updateStatusBadge('🟡 Verificando conexão...', 'checking');
    
    try {
        const response = await fetch(url + '/health', { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            const engineStatus = data.engine === 'running' ? ' + Engine ativo' : '';
            updateStatusBadge('✅ Backend online (Render)' + engineStatus, 'online');
            if (typeof Alerts !== 'undefined') {
                Alerts.add('✅ API online: ' + url, 'success');
            }
        } else {
            updateStatusBadge('❌ API respondeu com erro: ' + response.status, 'offline');
            if (typeof Alerts !== 'undefined') {
                Alerts.add('❌ API erro: ' + response.status, 'danger');
            }
        }
    } catch (e) {
        updateStatusBadge('❌ API offline: ' + url, 'offline');
        if (typeof Alerts !== 'undefined') {
            Alerts.add('❌ API offline: ' + e.message, 'danger');
        }
    }
}

function reconnectAPI() {
    updateStatusBadge('🔄 Reconectando...', 'checking');
    
    // Tentar reconectar WebSocket se existir
    if (window.filipaWS && typeof window.filipaWS.reconnect === 'function') {
        window.filipaWS.reconnect();
    }
    
    // Verificar API novamente após 1s
    setTimeout(() => {
        checkAPIStatus();
    }, 1000);
    
    if (typeof Alerts !== 'undefined') {
        Alerts.add('🔄 Reconectando ao servidor...', 'info');
    }
}

function saveAllConfig() {
    const modeSelect = document.getElementById('modeSelect');
    const apiUrlDisplay = document.getElementById('apiUrlDisplay');
    
    // Coletar valores (garantindo o fallback do Render)
    const newConfig = {
        mode: modeSelect?.value || 'production',
        apiUrl: apiUrlDisplay?.textContent?.trim() || 'https://filipa-analytics.onrender.com',
        dailyGoal: parseFloat(document.getElementById('configDailyGoal')?.value) || 150,
        lossLimit: parseFloat(document.getElementById('configLossLimit')?.value) || 100
    };

    // Configurações extras
    const extraConfig = {
        dailyGoal: newConfig.dailyGoal,
        lossLimit: newConfig.lossLimit,
        defaultSL: parseFloat(document.getElementById('configDefaultSL')?.value) || 2,
        defaultTP: parseFloat(document.getElementById('configDefaultTP')?.value) || 3,
        riskPerTrade: parseFloat(document.getElementById('configRiskPerTrade')?.value) || 2,
        minConfidence: parseFloat(document.getElementById('configMinConfidence')?.value) || 60,
        soundEnabled: document.getElementById('configSound')?.checked !== false,
        autoTrade: document.getElementById('configAutoTrade')?.checked || false
    };

    // Salvar no State
    FilipaState.config = newConfig;
    localStorage.setItem('filipa_config', JSON.stringify(newConfig));
    localStorage.setItem('filipa_extra_config', JSON.stringify(extraConfig));

    // Atualizar inputs do dashboard (Meta/Limite)
    const dailyGoalInput = document.getElementById('dailyGoal');
    if (dailyGoalInput) dailyGoalInput.value = extraConfig.dailyGoal;
    
    const lossLimitInput = document.getElementById('lossLimit');
    if (lossLimitInput) lossLimitInput.value = extraConfig.lossLimit;

    // Feedback
    const modeText = newConfig.mode === 'production' ? 'Produção' : 'Desenvolvimento';
    if (typeof Alerts !== 'undefined') {
        Alerts.add('💾 Configurações salvas! Modo: ' + modeText, 'success');
    }

    // Atualizar badge de status
    updateStatusBadge('✅ Configurações salvas', 'online');
    console.log('[Config] Salvo:', newConfig, extraConfig);
}

function checkYOLOStatus() {
    const yoloEl = document.getElementById('yoloConfigStatus');
    if (!yoloEl) return;

    // Verificar se o backend está online (Fallback seguro para o Render)
    const apiUrl = FilipaState.config.apiUrl || 'https://filipa-analytics.onrender.com';
    
    fetch(apiUrl + '/health', { method: 'GET' })
        .then(res => {
            if (res.ok) {
                updateYOLOStatus('✅ Online (Render)', 'online');
            } else {
                updateYOLOStatus('❌ Offline', 'offline');
            }
        })
        .catch(() => {
            updateYOLOStatus('❌ Offline', 'offline');
        });
}

function updateYOLOStatus(text, status) {
    const yoloEl = document.getElementById('yoloConfigStatus');
    if (!yoloEl) return;
    
    yoloEl.textContent = text;
    yoloEl.style.color = status === 'online' ? '#00ff88' : status === 'offline' ? '#ff4444' : '#ffaa00';
}

function updateStatusBadge(text, status) {
    const statusEl = document.getElementById('apiStatus');
    if (!statusEl) return;
    
    statusEl.className = 'api-status ' + status;
    statusEl.textContent = text;
}

// Inicializar
document.addEventListener('DOMContentLoaded', initConfig);
console.log('✅ Config v6.1 inicializado (Produção)');