// ============================================================
// CONTROLLER — ANALYZE v18.0 (Multi-Mercado com Router)
// ============================================================
const pipeline = require('../pipeline/pipeline');
const logger = require('../utils/logger');

const PIPELINE_TIMEOUT = 60000;

async function analyze(req, res) {
    const requestId = req.id || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.id = requestId;
    
    const { image, market_type } = req.body;

    if (!image) {
        return res.status(400).json({
            success: false,
            error: 'Imagem obrigatória.',
            requestId
        });
    }

    if (typeof image !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'Imagem deve ser uma string (base64 ou data URI).',
            requestId
        });
    }

    const trimmedImage = image.trim();
    if (trimmedImage.length < 100) {
        return res.status(400).json({
            success: false,
            error: 'Imagem muito curta ou corrompida.',
            requestId
        });
    }

    try {
        const finalMarketType = market_type || 'otc';
        
        logger.info('Iniciando análise', { 
            requestId, 
            marketType: finalMarketType 
        });

        const result = await Promise.race([
            pipeline.execute(trimmedImage, requestId, finalMarketType),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PIPELINE_TIMEOUT')), PIPELINE_TIMEOUT)
            )
        ]);

        if (!result) {
            throw new Error('Pipeline retornou resultado vazio');
        }

        logger.info('Análise concluída com sucesso', { 
            requestId,
            marketType: finalMarketType,
            direction: result.data?.decisao?.direcao,
            confidence: result.data?.decisao?.confianca
        });

        res.json({
            success: true,
            data: result.data,
            meta: result.meta || {
                requestId,
                timestamp: new Date().toISOString(),
                version: '18.0.0'
            },
            requestId
        });

    } catch (error) {
        const errorMessage = error.message || 'Erro desconhecido';
        logger.error('Erro na análise', { 
            requestId, 
            error: errorMessage
        });

        let traderMessage = 'Erro interno no processamento.';
        let statusCode = 500;

        if (errorMessage.includes('PIPELINE_TIMEOUT')) {
            traderMessage = '⏱️ Análise demorou muito. Tente novamente.';
            statusCode = 504;
        }

        res.status(statusCode).json({
            success: false,
            error: traderMessage,
            technical: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
            requestId
        });
    }
}

module.exports = { analyze };