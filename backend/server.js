const express = require('express');
const cors = require('cors'); // <-- OBRIGATÓRIO
const path = require('path');
const config = require('./config/env');
const logger = require('./utils/logger');
const { v4: uuidv4 } = require('uuid');

const app = express();

// 1. CORS BLINDADO: Permite Vercel, .com.br e localhost
app.use(cors({
    origin: '*', // Em produção, você pode trocar '*' por ['https://filipa-analytics.vercel.app', 'https://www.filipaanalytics.com.br']
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept']
}));
app.options('*', cors()); // Garante resposta às requisições de "preflight" do navegador

// 2. Parser de JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ... (o resto do seu server.js continua normal abaixo daqui)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. Middleware de Logging e Request ID
app.use(function(req, res, next) {
    req.id = uuidv4();
    res.setHeader('X-Request-ID', req.id);
    next();
});

app.use(function(req, res, next) {
    logger.info(`${req.method} ${req.path}`, { requestId: req.id });
    next();
});

// 5. Rotas da API
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api', require('./routes'));

// 6. Health Checks (CRUCIAL: Responde tanto em /health quanto /api/health)
const healthResponse = {
    success: true,
    version: '17.2.0',
    status: 'online',
    engine: 'running',
    timestamp: new Date().toISOString()
};

app.get('/health', (req, res) => {
    res.json(healthResponse);
});

app.get('/api/health', (req, res) => {
    res.json(healthResponse);
});

// 7. Serve arquivos estáticos (Frontend) como fallback
app.use(express.static(path.join(__dirname, '..')));

// 8. Error Handler Global
app.use(function(err, req, res, next) {
    logger.error(err.message, { requestId: req.id, stack: err.stack });
    res.status(err.status || 500).json({
        success: false,
        error: err.message,
        requestId: req.id
    });
});

// 9. Inicialização do Servidor
const PORT = config.port || process.env.PORT || 10000;
app.listen(PORT, function() {
    console.log('');
    console.log('============================================');
    console.log('  🚀 FILIPA v17.2 - BACKEND ONLINE');
    console.log('  Porta: ' + PORT);
    console.log('  Status: Online | CORS: Ativado (*)');
    console.log('  Pipeline: Vision → Quant → Curator → Judge');
    console.log('============================================');
    console.log('');
});

module.exports = app;