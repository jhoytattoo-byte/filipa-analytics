// ============================================================
// PULSE MARKET v1.0 — Gerenciador de sinais de trading
// ============================================================

const PulseMarket = {
    // Array de sinais armazenados
    signals: JSON.parse(localStorage.getItem('pulse_signals') || '[]'),

    // ─── ADICIONAR SINAL A PARTIR DA ANALISE ───
    addSignalFromAnalysis: function(analysisData) {
        console.log('[PulseMarket] Adicionando sinal da analise...', analysisData);

        if (!analysisData || !analysisData.data) {
            console.warn('[PulseMarket] Dados de analise invalidos');
            return false;
        }

        const data = analysisData.data;
        const decisao = data.decisao || {};
        const visao = data.visao || {};
        const quant = data.quant || {};
        const curador = data.curador || {};
        const meta = data.meta || {};

        const signal = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ativo: visao.ativo || 'N/A',
            timeframe: visao.timeframe || decisao.timeframe_sugerido || 'N/A',
            direcao: decisao.direcao || 'N/A',
            confianca: decisao.confianca || 0,
            score: quant.score_final || 0,
            qualidade: decisao.qualidade || 'D',
            preco_entrada: visao.preco_atual || null,
            stop_loss: decisao.estrategia?.stop_loss || null,
            take_profit: decisao.estrategia?.alvo1 || null,
            justificativa: decisao.justificativa || '',
            risco: decisao.risco_principal || '',
            regime: curador.regime || 'neutro',
            sessao: curador.sessao || 'N/A',
            duracao_ms: meta.duracao_ms || 0,
            custo_brl: meta.custo_brl || 0,
            resultado: null, // Preenchido manualmente depois
            status: 'ativo'
        };

        this.signals.unshift(signal); // Adiciona no inicio (mais recente)

        // Limitar a 100 sinais
        if (this.signals.length > 100) {
            this.signals = this.signals.slice(0, 100);
        }

        this.saveSignals();
        this.renderSignals();

        console.log('[PulseMarket] Sinal adicionado:', signal);
        return true;
    },

    // ─── SALVAR SINAIS NO LOCALSTORAGE ───
    saveSignals: function() {
        try {
            localStorage.setItem('pulse_signals', JSON.stringify(this.signals));
        } catch (e) {
            console.warn('[PulseMarket] Erro ao salvar sinais:', e);
        }
    },

    // ─── RENDERIZAR SINAIS NO DASHBOARD ───
    renderSignals: function() {
        const container = document.getElementById('pulse-signals-container');
        if (!container) return;

        if (this.signals.length === 0) {
            container.innerHTML = '<div class="pulse-empty">Nenhum sinal no historico</div>';
            return;
        }

        const html = this.signals.map(s => `
            <div class="pulse-signal ${s.direcao.toLowerCase()} ${s.status}">
                <div class="pulse-signal-header">
                    <span class="pulse-ativo">${s.ativo}</span>
                    <span class="pulse-timeframe">${s.timeframe}</span>
                    <span class="pulse-direcao ${s.direcao.toLowerCase()}">${s.direcao}</span>
                    <span class="pulse-confianca">${s.confianca}%</span>
                    <span class="pulse-qualidade">${s.qualidade}</span>
                </div>
                <div class="pulse-signal-body">
                    <span class="pulse-justificativa">${s.justificativa}</span>
                </div>
                <div class="pulse-signal-footer">
                    <span class="pulse-timestamp">${new Date(s.timestamp).toLocaleString('pt-BR')}</span>
                    <span class="pulse-custo">R$ ${(s.custo_brl || 0).toFixed(4)}</span>
                    <span class="pulse-duracao">${s.duracao_ms}ms</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    },

    // ─── ATUALIZAR RESULTADO DE UM SINAL ───
    updateResult: function(signalId, resultado) {
        const signal = this.signals.find(s => s.id === signalId);
        if (signal) {
            signal.resultado = resultado; // 'win', 'loss', 'empate'
            signal.status = 'fechado';
            this.saveSignals();
            this.renderSignals();
        }
    },

    // ─── LIMPAR HISTORICO ───
    clearHistory: function() {
        this.signals = [];
        this.saveSignals();
        this.renderSignals();
        console.log('[PulseMarket] Historico limpo');
    },

    // ─── ESTATISTICAS ───
    getStats: function() {
        const total = this.signals.length;
        const wins = this.signals.filter(s => s.resultado === 'win').length;
        const losses = this.signals.filter(s => s.resultado === 'loss').length;
        const winRate = total > 0 ? (wins / total * 100).toFixed(1) : 0;

        return {
            total,
            wins,
            losses,
            winRate,
            lucro_estimado: wins * 1.5 - losses * 1 // RR 1:1.5 aproximado
        };
    }
};

// ─── INICIALIZAR AO CARREGAR ───
document.addEventListener('DOMContentLoaded', function() {
    console.log('[PulseMarket] Inicializado');
    PulseMarket.renderSignals();
});

// ─── EXPORTAR PARA USO GLOBAL ───
if (typeof window !== 'undefined') {
    window.PulseMarket = PulseMarket;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseMarket;
}