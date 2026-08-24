// js/detections.js - VERSÃO v5.3 - CORRIGIDO
// ============================================================
// Aba Intelligence - Histórico de análises da IA
// Correção: compatibilidade com timestamp string do vision.js

function initDetections() {
    console.log('🔍 Inicializando Detecções v5.3...');
    atualizarListaDeteccoes();

    // Escuta atualizações de análises
    FilipaState.on('analyses', () => {
        atualizarListaDeteccoes();
    });
}

function atualizarListaDeteccoes() {
    const listEl = document.getElementById('detectionsList');
    if (!listEl) return;

    const analyses = FilipaState.analyses;

    if (analyses.length === 0) {
        listEl.innerHTML = `
            <div style="padding:40px;text-align:center;color:#8b9bb5;">
                <div style="font-size:3rem;margin-bottom:15px;">🔍</div>
                <div style="font-size:1.1rem;margin-bottom:10px;">Nenhuma detecção ainda</div>
                <div style="font-size:0.9rem;">Vá para a aba Vision e analise um gráfico para começar</div>
            </div>
        `;
        return;
    }

    listEl.innerHTML = analyses.map((a, index) => {
        // CORREÇÃO: timestamp pode ser string "HH:MM:SS" ou ISO
        let timeDisplay;
        try {
            const d = new Date(a.timestamp);
            if (isNaN(d.getTime())) {
                // Se não é data válida, usa a string diretamente
                timeDisplay = a.timestamp;
            } else {
                timeDisplay = d.toLocaleString('pt-BR');
            }
        } catch (e) {
            timeDisplay = a.timestamp || '--';
        }

        const dirColor = a.direcao === 'COMPRA' ? '#00ff88' : a.direcao === 'VENDA' ? '#ff4444' : '#9aa7bd';
        const dirBg = a.direcao === 'COMPRA' ? 'rgba(0,255,136,0.1)' : a.direcao === 'VENDA' ? 'rgba(255,68,68,0.1)' : 'rgba(154,167,189,0.1)';
        const isLatest = index === 0;

        return `
        <div style="padding:16px;border-bottom:1px solid rgba(255,255,255,0.05);${isLatest ? 'background:rgba(0,191,255,0.03);border-left:3px solid var(--primary);' : ''}transition:all .3s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='${isLatest ? 'rgba(0,191,255,0.03)' : 'transparent'}'">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:1.2rem;">${a.direcao === 'COMPRA' ? '🟢' : a.direcao === 'VENDA' ? '🔴' : '⚪'}</span>
                    <span style="color:#e0e6ed;font-weight:700;font-size:1rem;">${a.pair || 'N/A'}</span>
                    <span style="color:#8b9bb5;font-size:0.8rem;">${a.timeframe || '--'}</span>
                </div>
                <span style="color:${dirColor};font-weight:700;padding:5px 14px;border-radius:20px;background:${dirBg};font-size:0.85rem;border:1px solid ${dirColor}40;">
                    ${a.direcao || 'NEUTRO'}
                </span>
            </div>

            <div style="display:flex;gap:20px;color:#8b9bb5;font-size:0.85rem;margin-bottom:10px;flex-wrap:wrap;">
                <span style="display:flex;align-items:center;gap:5px;">
                    <span style="color:var(--primary);">🎯</span> ${a.confianca || 0}% confiança
                </span>
                <span style="display:flex;align-items:center;gap:5px;">
                    <span style="color:var(--secondary);">📊</span> Score: ${a.score || 0}
                </span>
                <span style="display:flex;align-items:center;gap:5px;">
                    <span style="color:var(--success);">⭐</span> ${a.forca || 'N/A'}
                </span>
                ${a.rr && a.rr !== '--' ? `<span style="display:flex;align-items:center;gap:5px;"><span style="color:var(--warning);">⚖️</span> RR ${a.rr}</span>` : ''}
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="color:#6b7a94;font-size:0.75rem;">
                    🕐 ${timeDisplay}
                </span>
                ${a.padrao && a.padrao !== 'N/A' ? `<span style="color:var(--primary);font-size:0.75rem;background:rgba(0,191,255,0.1);padding:3px 10px;border-radius:10px;">${a.padrao}</span>` : ''}
            </div>

            ${a.justificativa ? `
            <div style="color:#8b9bb5;font-size:0.8rem;margin-top:10px;font-style:italic;border-left:2px solid ${dirColor};padding-left:12px;line-height:1.5;">
                "${a.justificativa.substring(0, 120)}${a.justificativa.length > 120 ? '...' : ''}"
            </div>` : ''}
        </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', initDetections);

console.log('✅ Detections v5.3 inicializado');