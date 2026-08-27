const Vision = {
    currentImageBlob: null,
    currentImageBase64: null,
    isAnalyzing: false,
    audioContext: null,
    browserEngine: { isRunning: false, url: null, lastExtract: null },
    API_URL: 'https://filipa-analytics.onrender.com',
    lastAnalysis: null,

    init() {
        this.setupPaste();
        this.setupFileInput();
        this.setupDragDrop();
        this.setupBrowserEngine();
        this.setupLegacyBrowser();
        this.initAudio();
        this.checkBackendStatus();
        this.wakeUpBackend(); // 🔥 CORREÇÃO 2: Chamada adicionada
        console.log('Vision v14.8d inicializado');
    },

    initAudio() {
        try { this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { console.log('AudioContext nao disponivel'); }
    },

    // ✅ CORREÇÃO 1: Rota de health check alterada para /health (SEM /api)
    async checkBackendStatus() {
        try {
            const res = await fetch(this.API_URL + '/health'); 
            const data = await res.json();
            if (data.success) {
                this.updateBackendStatus(true, data.engine === 'running');
            } else {
                this.updateBackendStatus(false, false);
            }
        } catch (e) {
            console.log('Backend offline:', e.message);
            this.updateBackendStatus(false, false);
        }
        setTimeout(() => this.checkBackendStatus(), 15000);
    },

    // ✅ CORREÇÃO 1: Rota de health check alterada para /health (SEM /api)
    async wakeUpBackend() {
        try {
            await fetch(this.API_URL + '/health');
            console.log('[Vision] Backend acordado!');
        } catch (e) {
            setTimeout(() => this.wakeUpBackend(), 10000);
        }
    },

    updateBackendStatus(isOnline, engineRunning) {
        const statusEl = document.getElementById('apiStatus');
        const dotEl = document.getElementById('statusDot');
        const textEl = document.getElementById('apiStatusText');

        if (statusEl) {
            statusEl.className = 'api-status ' + (isOnline ? (engineRunning ? 'online' : 'checking') : 'offline');
            statusEl.textContent = isOnline 
                ? (engineRunning ? '✅ Backend online + Engine ativo' : '🟡 Backend online (Engine parado)')
                : '❌ Backend offline em ' + this.API_URL;
        }
        if (dotEl) dotEl.style.background = isOnline ? (engineRunning ? '#00ff88' : '#ffaa00') : '#ff4444';
        if (textEl) textEl.textContent = isOnline ? (engineRunning ? 'Online' : 'Standby') : 'Offline';
    },

    setupBrowserEngine() {
        const btnLaunch = document.getElementById('btnLaunchBrowser');
        const btnExtract = document.getElementById('btnExtractChart');
        const btnClose = document.getElementById('btnCloseBrowser');
        if (btnLaunch) btnLaunch.addEventListener('click', () => this.launchBrowser());
        if (btnExtract) btnExtract.addEventListener('click', () => this.extractChart());
        if (btnClose) btnClose.addEventListener('click', () => this.closeBrowser());
    },

    setupLegacyBrowser() {
        const btnAbrir = document.getElementById('btnAbrirCorretora');
        const inputLegacy = document.getElementById('urlCorretoraLegacy');
        const iframe = document.getElementById('corretoraFrameVision');
        if (btnAbrir && iframe) {
            btnAbrir.addEventListener('click', () => {
                const url = inputLegacy?.value.trim();
                if (url) iframe.src = url;
            });
        }
    },

    async launchBrowser() {
        const input = document.getElementById('urlCorretoraVision');
        const url = input?.value.trim();
        if (!url) { 
            this.mostrarStatus('warning', 'Digite a URL da corretora'); 
            input?.focus(); 
            return; 
        }
        this.mostrarStatus('loading', 'Iniciando navegador...');
        try {
            const res = await fetch(this.API_URL + '/api/browser/launch', {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.success) {
                this.browserEngine.isRunning = true;
                this.browserEngine.url = url;
                this.mostrarStatus('success', 'Navegador iniciado! Aguarde...');
                setTimeout(() => this.extractChart(), 12000);
            } else throw new Error(data.error || 'Falha ao iniciar');
        } catch (e) { 
            this.mostrarStatus('error', 'Erro: ' + e.message); 
            console.error(e);
        }
    },

    async extractChart() {
        if (!this.browserEngine.isRunning) { 
            this.mostrarStatus('warning', 'Inicie o navegador primeiro'); 
            return; 
        }
        this.mostrarStatus('loading', 'Extraindo grafico...');
        this.mostrarProgresso(true, 20, 'Localizando canvas...');
        try {
            const res = await fetch(this.API_URL + '/api/browser/extract', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' } 
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Falha na extracao');
            this.browserEngine.lastExtract = data.data;
            if (data.data.image_base64) {
                const imgBase64 = 'data:image/png;base64,' + data.data.image_base64;
                this.currentImageBase64 = imgBase64;
                document.getElementById('previewImg').src = imgBase64;
                document.getElementById('imagePreview').classList.add('active');
                document.getElementById('btnAnalyze').disabled = false;
            }
            const chart = data.data.chart || {};
            const analysis = chart.analysis || {};
            const numCandles = chart.candles ? chart.candles.length : 0;
            const trend = analysis.trend || 'INDEFINIDA';
            this.mostrarProgresso(true, 100, 'Pronto para analise!');
            this.mostrarStatus('success', numCandles + ' velas | Tendencia: ' + trend);
            setTimeout(() => this.mostrarProgresso(false), 2000);
        } catch (e) { 
            this.mostrarStatus('error', 'Erro: ' + e.message); 
            this.mostrarProgresso(false);
            console.error(e);
        }
    },

    async closeBrowser() {
        try {
            await fetch(this.API_URL + '/api/browser/close', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' } 
            });
            this.browserEngine.isRunning = false;
            this.mostrarStatus('ready', 'Navegador fechado');
        } catch (e) { console.error(e); }
    },

    setupPaste() {
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) { 
                    e.preventDefault(); 
                    this.carregarImagem(item.getAsFile()); 
                    break; 
                }
            }
        });
    },

    setupFileInput() {
        const input = document.getElementById('fileInput');
        const pasteArea = document.getElementById('pasteArea');
        if (input) input.addEventListener('change', (e) => { 
            const f = e.target.files?.[0]; 
            if (f) this.carregarImagem(f); 
        });
        if (pasteArea) pasteArea.addEventListener('click', (e) => { 
            if (e.target !== input) input?.click(); 
        });
    },

    setupDragDrop() {
        const area = document.getElementById('pasteArea');
        if (!area) return;
        ['dragover', 'dragleave', 'drop'].forEach(evt => {
            area.addEventListener(evt, (e) => {
                e.preventDefault(); 
                e.stopPropagation();
                area.classList.toggle('dragover', evt === 'dragover');
                if (evt === 'drop') { 
                    const f = e.dataTransfer?.files?.[0]; 
                    if (f?.type.startsWith('image/')) this.carregarImagem(f); 
                }
            });
        });
    },

    // ✅ CORREÇÃO 3: this agora funciona corretamente (guarda o contexto)
    carregarImagem(blob) {
        if (!blob) return;
        this.currentImageBlob = blob;
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImageBase64 = e.target.result;
            const img = document.getElementById('previewImg');
            if (img) img.src = e.target.result;
            document.getElementById('imagePreview').classList.add('active');
            document.getElementById('btnAnalyze').disabled = false;
            this.mostrarStatus('success', 'Imagem carregada!');
        };
        reader.onerror = () => this.mostrarStatus('error', 'Erro ao ler imagem');
        reader.readAsDataURL(blob);
    },

    removerImagem() {
        this.currentImageBlob = null; 
        this.currentImageBase64 = null;
        document.getElementById('imagePreview')?.classList.remove('active');
        const img = document.getElementById('previewImg'); 
        if (img) img.src = '';
        document.getElementById('fileInput').value = '';
        document.getElementById('btnAnalyze').disabled = true;
        this.mostrarStatus('ready', 'Aguardando imagem...');
    },

    // ============================================================
    // ANALISAR - v14.8d CORRIGIDO
    // ============================================================
    analisar: async function () {
        if (!this.currentImageBase64) { 
            this.mostrarStatus('error', 'Nenhuma imagem carregada'); 
            return; 
        }
        if (this.isAnalyzing) return;

        this.isAnalyzing = true;
        document.getElementById('btnAnalyze').disabled = true;
        this.mostrarStatus('loading', 'Analisando...');
        this.mostrarProgresso(true, 10, 'Preparando...');

        try {
            this.mostrarProgresso(true, 30, 'Enviando para analise...');
            const marketTypeElement = document.getElementById('marketType');
            const lastExtract = this.browserEngine && this.browserEngine.lastExtract;
            
            // ✅ CORREÇÃO 4 (log): Adiciona o log do endpoint antes do fetch
            const endpoint = this.API_URL + '/api/analyze';
            console.log('[VISION] POST →', endpoint);
            
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: this.currentImageBase64.split(',')[1],
                    market_type: marketTypeElement ? marketTypeElement.value : 'otc',
                    source: lastExtract ? 'browser_engine' : 'manual',
                    chartData: lastExtract && lastExtract.chart ? lastExtract.chart : null
                })
            });

            // ✅ CORREÇÃO 4 (log): Adiciona o log do status HTTP
            console.log('[VISION] HTTP ←', res.status, res.statusText);

            this.mostrarProgresso(true, 60, 'Processando...');
            if (!res.ok) throw new Error('HTTP ' + res.status);

            const data = await res.json();
            if (!data.success) throw new Error(data.error);

            const raw = data.data;
            const decisao = raw.decisao || {};
            const visao = raw.visao || {};
            const quant = raw.quant || {};
            const curador = raw.curador || {};
            const estrategia = decisao.estrategia || {};

            const c = parseInt(decisao.confianca) || 50;
            const d = decisao.direcao || 'NEUTRO';
            let probBuy, probSell;

            if (d === 'COMPRA') {
                probBuy = c >= 50 ? c : 100 - c;
                probSell = c >= 50 ? 100 - c : c;
            } else if (d === 'VENDA') {
                probSell = c >= 50 ? c : 100 - c;
                probBuy = c >= 50 ? 100 - c : c;
            } else {
                probBuy = 50;
                probSell = 50;
            }

            const resultado = {
                ativo: visao.ativo || 'N/A',
                timeframe: visao.timeframe || 'N/A',
                direcao: d,
                confianca: c,
                score: quant.score_final ?? quant.score ?? 0,
                candles: visao.candles_reais?.length ?? visao.candles?.length ?? visao.candles_extraidos ?? visao.num_candles ?? 0,
                rsi: quant.rsi ?? visao.rsi ?? '--',
                tendencia: visao.tendencia || quant.tendencia || 'INDEFINIDA',
                qualidade: this.calcularQualidade(c, quant.score_final),
                justificativa: decisao.justificativa || 'Analise concluida.',
                riscos: decisao.risco_principal || 'Riscos nao identificados.',
                precoAtual: estrategia.preco_atual || estrategia.preco_entrada || '--',
                stopLoss: estrategia.stop_loss || '--',
                takeProfit: estrategia.alvo1 || estrategia.take_profit || '--',
                rr: this.calcularRR(estrategia.stop_loss, estrategia.alvo1, estrategia.preco_atual),
                probBuy: probBuy,
                probSell: probSell,
                melhorEntrada: estrategia.entrada || 'AGORA',
                volatilidade: curador.volatilidade || 'Normal',
                sessao: curador.sessao || this.detectarSessao(),
                noticias: typeof curador.noticias === 'string' ? curador.noticias : (curador.noticias?.headlines ? curador.noticias.headlines.join(' | ') : 'Sem noticias relevantes'),
                engines: {
                    groqVision: { name: 'Groq Vision', status: visao && visao.ativo ? 'online' : 'offline' },
                    quant: { name: 'Quant Engine', status: 'online' },
                    curador: { name: curador.source === 'finnhub' ? 'Finnhub' : curador.source === 'twelvedata' ? 'Twelve Data' : curador.source === 'groq_fallback' ? 'Groq LLM' : 'Offline', status: curador.source && curador.source !== 'offline' ? 'online' : 'offline' },
                    claude: { name: 'Claude Haiku', status: decisao && decisao.direcao ? 'online' : 'offline' }
                }
            };

            this.lastAnalysis = resultado;

            if (data.meta?.costs) {
                this.registrarCustos(data.meta.costs);
            }
            this.exibirResultado(resultado);
            this.showModules(resultado);
            this.registrarHistorico(resultado, visao);
            this.mostrarProgresso(true, 100, 'Concluido!');

        } catch (e) { 
            // ✅ CORREÇÃO 5 (log no catch): Adiciona o log completo do erro
            console.error('[VISION] FALHA COMPLETA:', {
                message: e.message,
                endpoint: this.API_URL + '/api/analyze',
                error: e
            });
            this.mostrarStatus('error', 'Falha na comunicação com o servidor'); 
            if (typeof Alerts !== 'undefined') Alerts.add(e.message, 'error'); 
        }
        finally { 
            this.isAnalyzing = false; 
            document.getElementById('btnAnalyze').disabled = false; 
            setTimeout(() => this.mostrarProgresso(false), 3000); 
        }
    },

    // ============================================================
    // EXIBIR RESULTADO
    // ============================================================
    exibirResultado(dados) {
        const panel = document.getElementById('resultPanel');
        if (!panel) return;

        const agora = new Date().toLocaleTimeString('pt-BR');
        const cor = dados.direcao === 'COMPRA' ? '#00ff88' : dados.direcao === 'VENDA' ? '#ff4444' : '#ffaa00';

        panel.style.display = 'block'; 
        panel.classList.add('active');

        const tsEl = document.getElementById('resultTimestamp');
        if (tsEl) tsEl.textContent = agora;

        this.setText('resAtivo', dados.ativo);
        this.setText('resTimeframe', dados.timeframe);

        const dirEl = document.getElementById('resDirecao');
        if (dirEl) dirEl.innerHTML = `<span class="direction-badge ${dados.direcao.toLowerCase()}">${dados.direcao}</span>`;

        const confEl = document.getElementById('resConfianca');
        if (confEl) { 
            const confDisplay = dados.direcao === 'COMPRA' ? dados.probBuy : dados.direcao === 'VENDA' ? dados.probSell : dados.confianca;
            confEl.textContent = confDisplay + '%'; 
            confEl.style.color = cor; 
        }

        const scoreEl = document.getElementById('resScore');
        if (scoreEl) {
            scoreEl.textContent = dados.score;
            scoreEl.style.color = dados.score > 0 ? '#00ff88' : dados.score < 0 ? '#ff4444' : '#9aa7bd';
        }

        this.setText('resCandles', dados.candles);
        this.setText('resRSI', dados.rsi);
        this.setText('resTendencia', dados.tendencia);

        const qualEl = document.getElementById('resQualidade');
        if (qualEl) qualEl.innerHTML = `<span class="quality-badge ${dados.qualidade}">${dados.qualidade}</span>`;

        const riskSec = document.getElementById('riskSection');
        if (riskSec && dados.stopLoss !== '--') {
            riskSec.style.display = 'block';
            const marketSelect = document.getElementById('marketType');
            const mercadoSelecionado = marketSelect ? marketSelect.value : 'otc';
            this.setText('riskPrecoAtual', this.formatarNumero(dados.precoAtual, mercadoSelecionado));
            this.setText('riskStopLoss', this.formatarNumero(dados.stopLoss, mercadoSelecionado));
            this.setText('riskTakeProfit', this.formatarNumero(dados.takeProfit, mercadoSelecionado));
            this.setText('riskRR', dados.rr);
        } else if (riskSec) {
            riskSec.style.display = 'none';
        }

        const probSec = document.getElementById('probSection');
        if (probSec) {
            probSec.style.display = 'block';
            const pb = document.getElementById('probBuy');
            const ps = document.getElementById('probSell');
            if (pb) { pb.style.width = dados.probBuy + '%'; pb.innerHTML = `<span>${dados.probBuy}%</span>`; }
            if (ps) { ps.style.width = dados.probSell + '%'; ps.innerHTML = `<span>${dados.probSell}%</span>`; }
        }

        const timingSec = document.getElementById('timingSection');
        if (timingSec) {
            timingSec.style.display = 'grid';
            this.setText('timingEntry', dados.melhorEntrada);
            this.setText('timingVol', dados.volatilidade);
            this.setText('timingSession', dados.sessao);
            this.setText('timingNews', dados.noticias);
        }

        const analiseEl = document.getElementById('analysisText');
        if (analiseEl) {
            analiseEl.style.display = 'block';
            analiseEl.innerHTML = `<strong style="color:${cor}">🧠 filipa analisa:</strong> ${dados.justificativa}<br><br><strong style="color:#ff4444">⚠️ Riscos:</strong> ${dados.riscos}`;
        }

        const actions = document.getElementById('actionButtons');
        if (actions) {
            actions.style.display = 'flex';
            const btnBuy = document.getElementById('btnActionBuy');
            const btnSell = document.getElementById('btnActionSell');
            if (btnBuy) btnBuy.style.display = dados.direcao === 'COMPRA' ? 'flex' : 'none';
            if (btnSell) btnSell.style.display = dados.direcao === 'VENDA' ? 'flex' : 'none';
        }

        this.renderEnginesStatus(dados.engines);
    },

    // ✅ CORRIGIDO: Formatação sem duplicação
    formatarNumero(valor, mercado) {
        if (!valor || valor === '--' || isNaN(valor)) return '--';
        const num = parseFloat(valor);
        if (isNaN(num)) return '--';
        
        if (mercado && (mercado.includes('b3') || mercado.includes('WIN') || mercado.includes('WDO') || mercado.includes('Índice'))) {
            return Math.round(num).toLocaleString('pt-BR');
        }
        if (mercado && (mercado.includes('forex') || mercado.includes('EUR') || mercado.includes('USD') || mercado.includes('GBP'))) {
            return num.toFixed(5).replace('.', ',');
        }
        if (mercado && (mercado.includes('crypto') || mercado.includes('Bitcoin') || mercado.includes('Ethereum'))) {
            return num.toFixed(2).replace('.', ',');
        }
        if (mercado && (mercado.includes('stocks') || mercado.includes('Apple') || mercado.includes('Tesla'))) {
            return num.toFixed(2).replace('.', ',');
        }
        if (mercado && (mercado.includes('commodities') || mercado.includes('Ouro') || mercado.includes('Petróleo'))) {
            return num.toFixed(2).replace('.', ',');
        }
        if (mercado && mercado.includes('otc')) {
            return num.toFixed(5).replace('.', ',');
        }
        return num.toFixed(2).replace('.', ',');
    },

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '--';
    },

    renderEnginesStatus(engines) {
        const old = document.getElementById('enginesStatusSection');
        if (old) old.remove();

        const panel = document.getElementById('resultPanel');
        if (!panel || !engines) return;

        const html = `
        <div id="enginesStatusSection" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;padding:14px;background:rgba(0,191,255,.05);border:1px solid rgba(0,191,255,.15);border-radius:14px;">
            <div style="font-size:.7rem;color:#9aa7bd;width:100%;margin-bottom:10px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">🧠 IAs Utilizadas</div>
            ${this.engineBadge(engines.groqVision)}
            ${this.engineBadge(engines.quant)}
            ${this.engineBadge(engines.curador)}
            ${this.engineBadge(engines.claude)}
        </div>`;

        const header = panel.querySelector('.result-header');
        if (header) header.insertAdjacentHTML('afterend', html);
    },

    engineBadge(engine) {
        if (!engine) return '';
        const isOnline = engine.status === 'online';
        const color = isOnline ? '#00ff88' : '#ff4444';
        const bg = isOnline ? 'rgba(0,255,136,.1)' : 'rgba(255,68,68,.1)';
        const border = isOnline ? 'rgba(0,255,136,.2)' : 'rgba(255,68,68,.2)';
        return `<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;background:${bg};border:1px solid ${border};border-radius:20px;font-size:.75rem;font-weight:600;color:${color};"><span style="width:8px;height:8px;background:${color};border-radius:50%;"></span>${engine.name}</div>`;
    },

    showModules(dados) {
        const modules = ['timerModule', 'riskModule', 'contextModule', 'checklistModule'];
        modules.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'block';
        });

        this.setText('bestEntry', dados.melhorEntrada);
        this.setText('volatilityStatus', dados.volatilidade);
        this.setText('sessionStatus', dados.sessao);
        document.getElementById('timerLabel').textContent = 'Analise completa!';
        this.startTimerCountdown(60);

        const confInput = document.getElementById('riskConfidence');
        if (confInput) confInput.value = dados.confianca;
        this.calcRisk();

        this.setText('contextPrice', dados.precoAtual);
        this.setText('contextChange', dados.volatilidade);
        this.setText('contextHigh', '--');
        this.setText('contextLow', '--');
        this.setText('contextVolume', '--');
        this.setText('contextNews', dados.noticias);

        const c1 = document.getElementById('check1');
        const c2 = document.getElementById('check2');
        const c3 = document.getElementById('check3');
        if (c1) c1.checked = true;
        if (c2) c2.checked = dados.confianca >= 70;
        if (c3) c3.checked = dados.qualidade === 'A' || dados.qualidade === 'B';
        this.updateChecklist();
    },

    startTimerCountdown(seconds) {
        let remaining = seconds;
        const display = document.getElementById('timerCountdown');
        const circle = document.getElementById('timerProgress');
        if (!display) return;

        const interval = setInterval(() => {
            remaining--;
            const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
            const secs = (remaining % 60).toString().padStart(2, '0');
            display.textContent = `${mins}:${secs}`;
            if (circle) {
                const offset = 283 - (remaining / seconds) * 283;
                circle.setAttribute('stroke-dashoffset', offset);
            }
            if (remaining <= 0) {
                clearInterval(interval);
                display.textContent = '00:00';
                document.getElementById('timerLabel').textContent = 'Tempo expirado';
            }
        }, 1000);
        this._timerInterval = interval;
    },

    calcRisk() {
        const bankroll = parseFloat(document.getElementById('riskBankroll')?.value) || 1000;
        const percent = parseFloat(document.getElementById('riskPercent')?.value) || 2;
        const confidence = parseFloat(document.getElementById('riskConfidence')?.value) || 75;
        const payoff = parseFloat(document.getElementById('riskPayoff')?.value) || 1.5;

        const entryValue = bankroll * (percent / 100);
        const stopLoss = entryValue;
        const takeProfit = entryValue * payoff;
        const adjusted = entryValue * (confidence / 100);

        this.setText('riskEntryValue', 'R$ ' + entryValue.toFixed(2));
        this.setText('riskStopLossModule', 'R$ ' + stopLoss.toFixed(2));
        this.setText('riskTakeProfitModule', 'R$ ' + takeProfit.toFixed(2));
        this.setText('riskAdjusted', 'R$ ' + adjusted.toFixed(2));
    },

    updateChecklist() {
        const checks = ['check1','check2','check3','check4','check5','check6'];
        const checked = checks.filter(id => document.getElementById(id)?.checked).length;
        const status = document.getElementById('checklistStatus');
        if (!status) return;

        if (checked === checks.length) {
            status.className = 'checklist-status ready';
            status.innerHTML = '<span class="status-icon">✅</span><span class="status-text">PRONTO PARA OPERAR!</span>';
        } else {
            status.className = 'checklist-status';
            status.innerHTML = `<span class="status-icon">⏳</span><span class="status-text">${checked}/${checks.length} confirmacoes...</span>`;
        }
    },

    calcularQualidade(confianca, score) {
        const c = parseInt(confianca) || 0;
        const s = parseInt(score) || 0;
        if (c >= 80 && s >= 5) return 'A';
        if (c >= 70 && s >= 0) return 'B';
        if (c >= 50) return 'C';
        return 'D';
    },

    calcularRR(sl, tp, preco) {
        if (sl === '--' || tp === '--' || !preco || preco === '--') return '--';
        const stop = parseFloat(sl);
        const target = parseFloat(tp);
        const price = parseFloat(preco);
        if (isNaN(stop) || isNaN(target) || isNaN(price) || stop === 0) return '--';
        const risk = Math.abs(price - stop);
        const reward = Math.abs(target - price);
        if (risk === 0) return '--';
        return '1:' + (reward / risk).toFixed(1);
    },

    detectarSessao() {
        const agora = new Date();
        const h = agora.getHours();
        const diaSemana = agora.getDay();
        const ehDiaUtil = diaSemana >= 1 && diaSemana <= 5;
        if (ehDiaUtil && h >= 10 && h < 17) return 'B3 Aberta';
        if (!ehDiaUtil) return 'B3 Fechada (Fim de Semana)';
        if (h < 10) return 'B3 Fechada (Pre-Abertura)';
        if (h >= 17) return 'B3 Fechada (Pos-Fechamento)';
        const hUTC = agora.getUTCHours();
        if (hUTC >= 13 && hUTC < 22) return 'Europa + EUA';
        if (hUTC >= 22 || hUTC < 6) return 'Asia';
        if (hUTC >= 6 && hUTC < 13) return 'Europa';
        return 'Transicao';
    },

    registrarHistorico(resultado, visao) {
        const hist = { 
            timestamp: new Date().toLocaleTimeString('pt-BR'), 
            pair: resultado.ativo, 
            timeframe: resultado.timeframe, 
            direcao: resultado.direcao, 
            confianca: resultado.confianca, 
            forca: resultado.confianca >= 80 ? 'FORTE' : resultado.confianca >= 60 ? 'MODERADA' : 'FRACA', 
            padrao: visao.padrao_candle || 'N/A', 
            justificativa: resultado.justificativa, 
            source: this.browserEngine.lastExtract ? 'browser_engine' : 'manual',
            stopLoss: resultado.stopLoss,
            takeProfit: resultado.takeProfit,
            rr: resultado.rr
        };

        if (typeof FilipaState !== 'undefined') FilipaState.addAnalysis(hist);
        if (typeof Alerts !== 'undefined') Alerts.add(resultado.direcao + ' ' + resultado.ativo + ' | ' + resultado.confianca + '%', 'success');
        const histConf = resultado.direcao === 'COMPRA' ? resultado.probBuy : resultado.direcao === 'VENDA' ? resultado.probSell : resultado.confianca;
        this.mostrarStatus('success', resultado.direcao + ' | ' + histConf + '%');
        this.playAlert(resultado.direcao, resultado.confianca);

        if (Notification.permission === 'granted' && resultado.direcao !== 'NEUTRO') {
            new Notification('Filipa SINAL', { body: resultado.direcao + ' ' + resultado.ativo + ' - ' + resultado.confianca + '%' });
        }

        if (typeof PulseMarket !== 'undefined') PulseMarket.addSignalFromAnalysis(resultado);
        this.renderHistoryItem(hist);
    },

    renderHistoryItem(hist) {
        const list = document.getElementById('historyList');
        if (!list) return;
        const empty = list.querySelector('.empty-history');
        if (empty) empty.remove();

        const item = document.createElement('div');
        item.className = 'history-item ' + hist.direcao.toLowerCase();
        item.innerHTML = `
            <div class="history-time">${hist.timestamp}</div>
            <div class="history-pattern">${hist.pair} ${hist.padrao !== 'N/A' ? '| ' + hist.padrao : ''}</div>
            <div class="history-confidence">${hist.confianca}%</div>
            <div class="history-direction">${hist.direcao}</div>
        `;
        list.insertBefore(item, list.firstChild);
    },

    playAlert(direcao, confianca) {
        if (!this.audioContext) return;
        const confNum = parseFloat(confianca);
        if (isNaN(confNum) || !isFinite(confNum) || confNum < 0) return;
        if (direcao === 'NEUTRO' || confNum < 30) { this.playNeutralSound(); return; }

        const volume = Math.min(confNum / 100, 1) * 0.25;
        if (volume <= 0) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain); 
        gain.connect(this.audioContext.destination);

        if (direcao === 'COMPRA') { 
            osc.frequency.setValueAtTime(523, this.audioContext.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(784, this.audioContext.currentTime + 0.2); 
        } else { 
            osc.frequency.setValueAtTime(784, this.audioContext.currentTime); 
            osc.frequency.exponentialRampToValueAtTime(523, this.audioContext.currentTime + 0.2); 
        }

        gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        osc.start(this.audioContext.currentTime); 
        osc.stop(this.audioContext.currentTime + 0.4);
    },

    playNeutralSound() {
        if (!this.audioContext) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain); 
        gain.connect(this.audioContext.destination);
        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        osc.start(this.audioContext.currentTime); 
        osc.stop(this.audioContext.currentTime + 0.2);
    },

    mostrarStatus(tipo, msg) { 
        const el = document.getElementById('analysisStatus'); 
        if (el) { el.className = 'status-text ' + tipo; el.textContent = msg; } 
    },

    mostrarProgresso(ativo, pct, texto) { 
        const c = document.getElementById('progressContainer'), f = document.getElementById('progressFill'), t = document.getElementById('progressText'); 
        if (!c) return; 
        if (!ativo) { c.classList.remove('active'); return; } 
        c.classList.add('active'); 
        if (f) f.style.width = (pct || 0) + '%'; 
        if (t) t.textContent = texto || 'Processando...'; 
    },

    async registrarCustos(costs) {
        try {
            if (costs.groq > 0) {
                await fetch(this.API_URL + '/api/admin/costs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        engine: 'groq',
                        cost: costs.groq,
                        operation: 'vision_extract',
                        details: { timestamp: new Date().toISOString() }
                    })
                });
            }
            if (costs.deepseek > 0) {
                await fetch(this.API_URL + '/api/admin/costs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        engine: 'deepseek',
                        cost: costs.deepseek,
                        operation: 'context_analysis',
                        details: { timestamp: new Date().toISOString() }
                    })
                });
            }
            if (costs.claude > 0) {
                await fetch(this.API_URL + '/api/admin/costs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        engine: 'claude',
                        cost: costs.claude,
                        operation: 'decision',
                        details: { timestamp: new Date().toISOString() }
                    })
                });
            }
            console.log('[Vision] Custos registrados no Admin:', costs);
        } catch (e) {
            console.log('[Vision] Erro ao registrar custos:', e.message);
        }
    },

    confirmTrade(direcao) {
        if (!this.lastAnalysis) return;
        const dados = this.lastAnalysis;
        const msg = `Confirmar ${direcao}?\n\n` +
            `Ativo: ${dados.ativo}\n` +
            `Confiança: ${dados.confianca}%\n` +
            `SL: ${dados.stopLoss}\n` +
            `TP: ${dados.takeProfit}\n` +
            `RR: ${dados.rr}`;

        if (!confirm(msg)) return;

        const trade = {
            date: new Date().toISOString(),
            pair: dados.ativo,
            direction: direcao,
            result: null,
            value: parseFloat(document.getElementById('riskEntryValue')?.textContent?.replace(/[^0-9.,]/g, '').replace(',', '.') || 20),
            timeframe: dados.timeframe,
            confidence: dados.confianca,
            stop_loss: dados.stopLoss,
            take_profit: dados.takeProfit
        };

        if (typeof FilipaState !== 'undefined') FilipaState.addTrade(trade);
        if (typeof Trading !== 'undefined') Trading.renderTrades();
        if (typeof Alerts !== 'undefined') Alerts.add(`Trade ${direcao} registrado!`, 'success');
    },

    dismissResult() {
        const panel = document.getElementById('resultPanel');
        if (panel) { panel.style.display = 'none'; panel.classList.remove('active'); }

        ['timerModule','riskModule','contextModule','checklistModule'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (this._timerInterval) clearInterval(this._timerInterval);
        this.mostrarStatus('ready', 'Resultado descartado. Aguardando nova analise...');
    },

    novaAnalise() {
        this.dismissResult();
        this.removerImagem();
        this.mostrarStatus('ready', 'Aguardando nova imagem...');
        if (typeof Alerts !== 'undefined') Alerts.add('Nova analise', 'info');
    }
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    Vision.init();
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();

    ['check1','check2','check3','check4','check5','check6'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => Vision.updateChecklist());
    });
});

window.Vision = Vision;