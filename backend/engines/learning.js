// ============================================================
// ENGINE — LEARNING v17.7 (SQLite) - CORRIGIDO PARA RENDER
// ============================================================
// CHANGELOG v17.7:
// - Try/catch em todas as operações DB
// - NUNCA crasha o pipeline se DB falhar
// - Loga erro mas continua execução
// - Caminho do DB alterado para /tmp (permite escrita no Render)
// ============================================================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 🔥 CORREÇÃO: Usar variável de ambiente ou pasta /tmp (permite escrita no Render)
const dbPath = process.env.DATABASE_PATH || '/tmp/learning.db';
let db = null;

// Inicialização segura do DB
try {
    db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS operacoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                request_id TEXT,
                ativo TEXT,
                timeframe TEXT,
                direcao TEXT,
                confianca INTEGER,
                score INTEGER,
                qualidade TEXT,
                visao_json TEXT,
                quant_json TEXT,
                contexto_json TEXT,
                decisao_json TEXT,
                resultado TEXT,
                lucro REAL
            )
        `, (err) => {
            if (err) console.error('[Learning] Erro ao criar tabela:', err.message);
            else console.log('[Learning] ✅ Tabela operacoes pronta');
        });
    });
} catch (e) {
    console.error('[Learning] ❌ Falha ao inicializar SQLite:', e.message);
    db = null;
}

function save(context) {
    if (!db) {
        console.warn('[Learning] ⚠️ DB não disponível, pulando persistência');
        return Promise.resolve(null);
    }

    const { visao, quant, contexto, decisao, requestId } = context;

    return new Promise((resolve) => {
        db.run(`
            INSERT INTO operacoes (
                timestamp, request_id, ativo, timeframe, direcao, confianca, score, qualidade,
                visao_json, quant_json, contexto_json, decisao_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            new Date().toISOString(),
            requestId || 'N/A',
            visao?.ativo || 'N/A',
            visao?.timeframe || 'N/A',
            decisao?.direcao || 'N/A',
            decisao?.confianca || 0,
            quant?.score_final || 0,
            decisao?.qualidade || 'C',
            JSON.stringify(visao || {}),
            JSON.stringify(quant || {}),
            JSON.stringify(contexto || {}),
            JSON.stringify(decisao || {})
        ], function(err) {
            if (err) {
                console.error('[Learning] ❌ Erro ao salvar:', err.message);
                resolve(null);
            } else {
                console.log(`[Learning] ✅ Operação salva (ID: ${this.lastID})`);
                resolve(this.lastID);
            }
        });
    });
}

module.exports = { save };