// ============================================================
// CONFIG v6.1 — Configurações do Filipa (PRODUÇÃO - RENDER)
// ============================================================
function initConfig() {
    console.log('⚙️ Inicializando Config v6.1 (Produção)...');
    loadConfigValues();
    setupEventListeners();
    checkYOLOStatus();
    setInterval(checkYOLOStatus, 10000);
}

function loadConfigValues() {
    const config = FilipaState.config;
    const apiUrlDisplay = document.getElementById('apiUrlDisplay');
    const correctApiUrl = config.apiUrl || 'https://filipa-analytics.onrender.com';
    if (apiUrlDisplay) apiUrlDisplay.textContent = correctApiUrl;

    const modeSelect = document.getElementById('modeSelect');
    if (modeSelect) modeSelect.value = config.mode || 'production';
    updateYOLOStatus('Detectando...', 'checking');
    
    const extraConfig = JSON.parse(localStorage.getItem('filipa_extra_config') || '{}');
    const dailyGoalInput = document.getElementById('configDailyGoal');
    if (dailyGoalInput) dailyGoalInput.value = extraConfig.dailyGoal || config.dailyGoal || 150;
    const lossLimitInput = document.getElementById('configLossLimit');
    if (lossLimitInput) lossLimitInput.value = extraConfig.lossLimit || config.lossLimit || 100;
    const defaultSL = document.getElementById('configDefaultSL');
    if (defaultSL) defaultSL.value = extraConfig.defaultSL || 2;
    const defaultTP = document.getElementById('configDefaultTP');
    if (defaultTP) defaultTP.value = extraConfig.defaultTP || 3;
    const riskPerTrade = document.getElementById('configRiskPerTrade');
    if (riskPerTrade) riskPerTrade.value = extraConfig.riskPerTrade || 2;
    const minConfidence = document.getElementById('configMinConfidence');
    if (minConfidence) minConfidence.value = extraConfig.minConfidence || 60;
    const desktopAlerts = document.getElementById('desktopAlerts');
    if (desktopAlerts) desktopAlerts.checked = localStorage.getItem('filipa_alerts_desktop') === 'true';
    const soundEnabled = document.getElementById('configSound');
    if (soundEnabled) soundEnabled.checked = extraConfig.soundEnabled !== false;
    const autoTrade = document.getElementById('configAutoTrade');
    if (autoTrade) autoTrade.checked = extraConfig.autoTrade || false;
}

function setupEventListeners() {
    const verifyBtn = document.querySelector('.config-btn[onclick*="checkStatus"]');
    if (verifyBtn) verifyBtn.onclick = async () => { await checkAPIStatus(); };
    const reconnectBtn = document.querySelector('.config-btn[onclick*="Reconectar"]');
    if (reconnectBtn) reconnectBtn.onclick = () => { reconnectAPI(); };
    const saveBtn = document.querySelector('.config-btn[onclick*="Salvar"]');
    if (saveBtn) saveBtn.onclick = () => { saveAllConfig(); };
    const desktopAlerts = document.getElementById('desktopAlerts');
    if (desktopAlerts) desktopAlerts.addEventListener('change', () => { Alerts.toggleDesktop(); });
}

async function checkAPIStatus() {
    const apiUrlDisplay = document.getElementById('apiUrlDisplay');
    const url = apiUrlDisplay?.textContent?.trim() || 'https://filipa-analytics.onrender.com';
    updateStatusBadge('🟡 Verificando conexão...', 'checking');
    try {
        const response = await fetch(url + '/health', { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            const engineStatus = data.engine === 'running' ? ' + Engine ativo' : '';
            updateStatusBadge('✅ Backend online (Render)' + engineStatus, 'online');
            if (typeof Alerts !== 'undefined') Alerts.add('✅ API online: ' + url, 'success');
        } else {
            updateStatusBadge('❌ API respondeu com erro: ' + response.status, 'offline');
        }
    } catch (e) {
        updateStatusBadge('❌ API offline: ' + url, 'offline');
    }
}

function reconnectAPI() {
    updateStatusBadge('🔄 Reconectando...', 'checking');
    if (window.filipaWS && typeof window.filipaWS.reconnect === 'function') window.filipaWS.reconnect();
    setTimeout(() => { checkAPIStatus(); }, 1000);
    if (typeof Alerts !== 'undefined') Alerts.add('🔄 Reconectando ao servidor...', 'info');
}

function saveAllConfig() {
    const modeSelect = document.getElementById('modeSelect');
    const apiUrlDisplay = document.getElementById('apiUrlDisplay');
    const newConfig = {
        mode: modeSelect?.value || 'production',
        apiUrl: apiUrlDisplay?.textContent?.trim() || 'https://filipa-analytics.onrender.com',
        dailyGoal: parseFloat(document.getElementById('configDailyGoal')?.value) || 150,
        lossLimit: parseFloat(document.getElementById('configLossLimit')?.value) || 100
    };
    const extraConfig = {
        dailyGoal: newConfig.dailyGoal, lossLimit: newConfig.lossLimit,
        defaultSL: parseFloat(document.getElementById('configDefaultSL')?.value) || 2,
        defaultTP: parseFloat(document.getElementById('configDefaultTP')?.value) || 3,
        riskPerTrade: parseFloat(document.getElementById('configRiskPerTrade')?.value) || 2,
        minConfidence: parseFloat(document.getElementById('configMinConfidence')?.value) || 60,
        soundEnabled: document.getElementById('configSound')?.checked !== false,
        autoTrade: document.getElementById('configAutoTrade')?.checked || false
    };
    FilipaState.config = newConfig;
    localStorage.setItem('filipa_config', JSON.stringify(newConfig));
    localStorage.setItem('filipa_extra_config', JSON.stringify(extraConfig));
    const dailyGoalInput = document.getElementById('dailyGoal');
    if (dailyGoalInput) dailyGoalInput.value = extraConfig.dailyGoal;
    const lossLimitInput = document.getElementById('lossLimit');
    if (lossLimitInput) lossLimitInput.value = extraConfig.lossLimit;
    const modeText = newConfig.mode === 'production' ? 'Produção' : 'Desenvolvimento';
    if (typeof Alerts !== 'undefined') Alerts.add('💾 Configurações salvas! Modo: ' + modeText, 'success');
    updateStatusBadge('✅ Configurações salvas', 'online');
}

function checkYOLOStatus() {
    const yoloEl = document.getElementById('yoloConfigStatus');
    if (!yoloEl) return;
    const apiUrl = FilipaState.config.apiUrl || 'https://filipa-analytics.onrender.com';
    fetch(apiUrl + '/health', { method: 'GET' })
        .then(res => {
            if (res.ok) updateYOLOStatus('✅ Online (Render)', 'online');
            else updateYOLOStatus('❌ Offline', 'offline');
        })
        .catch(() => { updateYOLOStatus('❌ Offline', 'offline'); });
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

document.addEventListener('DOMContentLoaded', initConfig);
console.log('✅ Config v6.1 inicializado (Produção)');