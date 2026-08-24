// ============================================================
// ROUTES — ANALYZE v17.7
// ============================================================
// CHANGELOG v17.7:
// - Adicionado middleware de requestId para rastreamento
// ============================================================

const express = require('express');
const router = express.Router();
const { analyze } = require('../controllers/analyzeController');

// Middleware: garante requestId em toda requisição
router.use((req, res, next) => {
    req.id = req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    next();
});

router.post('/', analyze);

module.exports = router;