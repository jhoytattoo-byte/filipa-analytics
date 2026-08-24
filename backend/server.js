// ============================================================
// FILIPA v17 — SERVER (Rate Limit v3.0 + Kiwify Webhook)
// ============================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const logger = require('./utils/logger');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID']
}));

app.use(express.json({ limit: '50mb' }));

// 🔥 SERVE A RAIZ DO PROJETO (onde está o dashboard.html)
app.use(express.static(path.join(__dirname, '..')));

app.use(function(req, res, next) {
    req.id = require('uuid').v4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

app.use(function(req, res, next) {
    logger.info(req.method + ' ' + req.path, { requestId: req.id });
    next();
});

// Webhook Kiwify — precisa vir antes das rotas da API
app.use('/api/webhooks', require('./routes/webhooks'));

// Rotas da API
app.use('/api', require('./routes'));

// Health check
app.get('/health', function(req, res) {
    res.json({
        success: true,
        version: '17.0.0',
        status: 'online',
        timestamp: new Date().toISOString()
    });
});

// Error handler
app.use(function(err, req, res, next) {
    logger.error(err.message, { requestId: req.id, stack: err.stack });
    res.status(err.status || 500).json({
        success: false,
        error: err.message,
        requestId: req.id
    });
});

app.listen(config.port, function() {
    console.log('');
    console.log('============================================');
    console.log('  FILIPA v17.0');
    console.log('  Porta: ' + config.port);
    console.log('  Status: Online');
    console.log('  Pipeline: Vision → Quant → Curator → Judge');
    console.log('  Rate Limit: v3.0 Ativo');
    console.log('  Kiwify Webhook: /api/webhooks/kiwify');
    console.log('============================================');
    console.log('');
});

module.exports = app;