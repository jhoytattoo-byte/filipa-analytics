// ============================================================
// FILIPA v17.1 — SERVER (Corrigido: CORS + Rotas de Health)
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');

const app = express();

// 1. CORS: Permitir todas as origens (Vercel, .com.br, localhost, etc.)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

// 2. Parser de JSON com limite alto para receber imagens Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Middleware de Logging e Request ID
app.use(function(req, res, next) {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

app.use(function(req, res, next) {
    logger.info(`${req.method} ${req.path}`, { requestId: req.id });
    next();
});

// 4. Rotas da API (Webhooks e Analyze)
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api', require('./routes'));

// 5. Health Checks (CRUCIAL: Adicionado /api/health para bater com o frontend)
const healthResponse = {
    success: true,
    version: '17.1.0',
    status: 'online',
    engine: 'running', // <-- Adicionado para o frontend reconhecer como online
    timestamp: new Date().toISOString()
};

app.get('/health', (req, res) => {
    res.json(healthResponse);
});

app.get('/api/health', (req, res) => {
    res.json(healthResponse);
});

// 6. Serve arquivos estáticos (Frontend) como fallback
app.use(express.static(path.join(__dirname, '..')));

// 7. Error Handler Global
app.use(function(err, req, res, next) {
    logger.error(err.message, { requestId: req.id, stack: err.stack });
    res.status(err.status || 500).json({
        success: false,
        error: err.message,
        requestId: req.id
    });
});

// 8. Inicialização do Servidor
const PORT = config.port || process.env.PORT || 10000;
app.listen(PORT, function() {
    console.log('');
    console.log('============================================');
    console.log('  🚀 FILIPA v17.1 - BACKEND ONLINE');
    console.log('  Porta: ' + PORT);
    console.log('  Status: Online');
    console.log('  Pipeline: Vision → Quant → Curator → Judge');
    console.log('  Rate Limit: v3.0 Ativo');
    console.log('  Kiwify Webhook: /api/webhooks/kiwify');
    console.log('  Health Check: /health e /api/health');
    console.log('============================================');
    console.log('');
});

module.exports = app;