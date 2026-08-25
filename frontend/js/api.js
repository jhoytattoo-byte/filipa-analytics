// ============================================================
// API v7.3 — Backend no Render (Produção)
// ============================================================
const API = {
    baseUrl: 'https://filipa-analytics.onrender.com',
    online: false,

    async checkStatus() {
        try {
            const res = await fetch(`${this.baseUrl}/health`, { method: 'GET', mode: 'cors' });
            this.online = res.ok;
            const statusEl = document.getElementById('apiStatus');
            if (statusEl) {
                statusEl.className = 'api-status ' + (this.online ? 'online' : 'offline');
                statusEl.textContent = this.online 
                    ? '✅ Backend online (Render)' 
                    : '❌ Backend offline em ' + this.baseUrl;
            }
            return this.online;
        } catch (e) {
            this.online = false;
            const statusEl = document.getElementById('apiStatus');
            if (statusEl) {
                statusEl.className = 'api-status offline';
                statusEl.textContent = '❌ Backend offline em ' + this.baseUrl;
            }
            return false;
        }
    },

    async analyzeImage(base64Image) {
        try {
            const res = await fetch(`${this.baseUrl}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image.split(',')[1] }),
                mode: 'cors'
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${res.status}`);
            }
            return await res.json();
        } catch (e) {
            throw new Error(`Erro na análise: ${e.message}`);
        }
    },

    startPolling() {
        this.checkStatus();
        setInterval(() => this.checkStatus(), 15000);
    }
};
window.API = API;