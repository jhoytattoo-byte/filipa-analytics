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
        this.wakeUpBackend();
        console.log('Vision v14.8d inicializado');
    },

    initAudio() {
        try { this.audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
        catch (e) { console.log('AudioContext nao disponivel'); }
    },

    // ✅ CORRIGIDO: Sem headers, com intervalo de 15 segundos
    async checkBackendStatus() {
        try {
            const res = await fetch(this.API_URL + '/api/health'); 
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

    // ✅ CORRIGIDO: Função única para acordar
    async wakeUpBackend() {
        try {
            await fetch(this.API_URL + '/api/health');
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
    // ANALISAR
    // ============================================================
    async analisar() {
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
            const res = await fetch(this.API_URL + '/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: this.currentImageBase64.split(',')[1],
                    market_type: marketTypeElement ? marketTypeElement.value : 'otc',
                    source: lastExtract ? 'browser_engine' : 'manual',
                    chartData: lastExtract && lastExtract.chart ? lastExtract.chart : null
                })
            });

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
            this.mostrarStatus('error', 'Erro: ' + e.message); 
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
            if (ps) { ps.style.width = dados.probSell +