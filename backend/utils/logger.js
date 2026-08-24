// ============================================================
// UTILS — LOGGER (v17.1)
// ============================================================

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../logs');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_FILE = path.join(LOG_DIR, `filipa-${new Date().toISOString().slice(0, 10)}.log`);

function formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const requestId = meta.requestId || 'system';

    // 🚫 FILTRAR health checks no console (mas salvar no arquivo)
    const isHealthCheck = message && (
        message.includes('GET /api/health') || 
        message.includes('GET /health')
    );

    const logEntry = `[${timestamp}] [${level.toUpperCase()}] [${requestId}] ${message}`;

    // Sempre salva no arquivo
    fs.appendFileSync(LOG_FILE, logEntry + (meta.stack ? '\n' + meta.stack : '') + '\n');

    // No console: mostra tudo EXCETO health checks repetitivos
    if (!isHealthCheck) {
        console.log(logEntry);
    }

    return logEntry;
}

const logger = {
    info: (message, meta) => formatMessage('INFO', message, meta),
    error: (message, meta) => formatMessage('ERROR', message, meta),
    warn: (message, meta) => formatMessage('WARN', message, meta),
    debug: (message, meta) => formatMessage('DEBUG', meta)
};

module.exports = logger;