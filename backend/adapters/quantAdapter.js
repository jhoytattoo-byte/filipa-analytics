// ============================================================
// QUANT ADAPTER v1.4 — CORRIGIDO (busca em services/)
// ============================================================
// Localização: backend/adapters/quantAdapter.js
// ============================================================

const path = require('path');

// Tenta carregar as engines disponíveis
let quantEngineV3, patchEngine;

// 1. Carrega quantEngine v3.0 (está em engines/)
try {
    quantEngineV3 = require('../engines/quant');
    console.log('[QuantAdapter] ✅ quantEngine v3.0 carregada');
} catch (error) {
    console.warn('[QuantAdapter] ⚠️ quantEngine v3.0 não encontrada:', error.message);
    quantEngineV3 = null;
}

// 2. Tenta carregar quantEngine_patch de MÚLTIPLOS locais
const patchPaths = [
    '../services/quantEngine_patch.js',    // ← PRIORIDADE 1 (services/)
    '../engines/quantEngine_patch.js',     // ← FALLBACK 1 (engines/)
    '../quantEngine_patch.js',             // ← FALLBACK 2 (raiz)
    '../services/quantEngine_patch',       // ← FALLBACK 3 (sem .js)
    '../engines/quantEngine_patch',        // ← FALLBACK 4
    '../quantEngine_patch'                 // ← FALLBACK 5
];

for (const patchPath of patchPaths) {
    try {
        patchEngine = require(patchPath);
        console.log(`[QuantAdapter] ✅ quantEngine_patch carregada de: ${patchPath}`);
        break;
    } catch (error) {
        // Tenta o próximo caminho
    }
}

if (!patchEngine) {
    console.warn('[QuantAdapter] ⚠️ quantEngine_patch não encontrada (usando fallback manual)');
    patchEngine = null;
}

/**
 * Função principal de cálculo (interface padrão)
 * AGORA É ASYNC!
 */
async function calculate(input) {
    console.log('[QuantAdapter] Iniciando cálculo...');

    // ============================================================
    // CASO 1: Input é ARRAY de candles
    // ============================================================
    if (Array.isArray(input)) {
        console.log(`[QuantAdapter] Array detectado: ${input.length} candles`);

        if (patchEngine && typeof patchEngine.calcularScore === 'function') {
            try {
                const result = patchEngine.calcularScore(input);
                console.log(`[QuantAdapter] Patch: score=${result.score}, confianca=${result.confianca}`);
                return formatResult(result, input.length, 'patch');
            } catch (error) {
                console.error('[QuantAdapter] Erro no patch:', error.message);
            }
        }

        console.warn('[QuantAdapter] Usando fallback manual');
        return calcularScoreManual(input);
    }

    // ============================================================
    // CASO 2: Input é OBJETO com .candles
    // ============================================================
    if (input && typeof input === 'object' && input.candles && Array.isArray(input.candles)) {
        console.log(`[QuantAdapter] Objeto com candles detectado: ${input.candles.length} candles`);

        // Prioridade 1: Usar quantEngine v3.0 (AGORA COM AWAIT!)
        if (quantEngineV3 && typeof quantEngineV3.quantEngine === 'function') {
            try {
                console.log('[QuantAdapter] Chamando quantEngine v3.0 (async)...');
                const result = await quantEngineV3.quantEngine(input, input.candles);
                console.log('[QuantAdapter] v3.0 resultado bruto:', JSON.stringify(result, null, 2));
                
                if (!result || Object.keys(result).length === 0) {
                    console.warn('[QuantAdapter] v3.0 retornou vazio, usando fallback');
                    return calcularScoreManual(input.candles);
                }
                
                const scoreFinal = result.score_final !== undefined ? result.score_final : 
                                  (result.score?.score_final || 0);
                const direcao = result.direcao_quant || result.direcao || 'NEUTRO';
                const forca = result.forca_quant || result.forca || 'FRACA';
                const confianca = result.confianca_dados || result.confidence || 50;
                const rsi = result.rsi || 50;
                const fatores = result.fatores || [];
                const numCandles = result.num_candles || input.candles.length;

                console.log(`[QuantAdapter] v3.0: score=${scoreFinal}, direcao=${direcao}, confianca=${confianca}`);
                
                return {
                    score: typeof scoreFinal === 'number' ? scoreFinal : 0,
                    confidence: typeof confianca === 'number' ? confianca : 50,
                    rsi: typeof rsi === 'number' ? rsi : 50,
                    candles_validos: numCandles,
                    direcao: direcao,
                    forca: forca,
                    fatores: fatores,
                    fonte: 'quant_v3'
                };
            } catch (error) {
                console.error('[QuantAdapter] Erro na v3.0:', error.message);
                console.error('[QuantAdapter] Stack:', error.stack);
                console.warn('[QuantAdapter] Usando fallback manual após erro');
                return calcularScoreManual(input.candles);
            }
        }

        // Prioridade 2: Usar patchEngine com os candles
        if (patchEngine && typeof patchEngine.calcularScore === 'function') {
            try {
                const result = patchEngine.calcularScore(input.candles);
                console.log(`[QuantAdapter] Patch (via objeto): score=${result.score}`);
                return formatResult(result, input.candles.length, 'patch');
            } catch (error) {
                console.error('[QuantAdapter] Erro no patch (via objeto):', error.message);
            }
        }

        // Prioridade 3: Fallback manual
        console.warn('[QuantAdapter] Fallback manual (via objeto)');
        return calcularScoreManual(input.candles);
    }

    // ============================================================
    // CASO 3: Input inválido
    // ============================================================
    console.error('[QuantAdapter] Input inválido:', typeof input);
    return {
        score: 0,
        confidence: 10,
        rsi: 50,
        candles_validos: 0,
        direcao: 'NEUTRO',
        forca: 'FRACA',
        fatores: ['input_invalido'],
        fonte: 'erro',
        erro: 'Input deve ser array ou objeto com .candles'
    };
}

/**
 * Formata resultado do patch de forma consistente
 */
function formatResult(result, totalCandles, fonte) {
    return {
        score: typeof result.score === 'number' ? result.score : 0,
        confidence: typeof result.confianca === 'number' ? result.confianca : 30,
        rsi: typeof result.rsi === 'number' ? result.rsi : 50,
        candles_validos: result.candlesValidos || totalCandles || 0,
        direcao: result.score > 0.15 ? 'COMPRA' : result.score < -0.15 ? 'VENDA' : 'NEUTRO',
        forca: Math.abs(result.score) > 0.5 ? 'FORTE' : Math.abs(result.score) > 0.25 ? 'MODERADA' : 'FRACA',
        fatores: result.fatores || ['patch_engine'],
        fonte: fonte || 'patch'
    };
}

/**
 * Fallback manual (quando nenhuma engine está disponível)
 */
function calcularScoreManual(candles) {
    if (!Array.isArray(candles) || candles.length < 5) {
        return {
            score: 0,
            confidence: 10,
            rsi: 50,
            candles_validos: 0,
            direcao: 'NEUTRO',
            forca: 'FRACA',
            fatores: ['dados_insuficientes'],
            fonte: 'manual_fallback'
        };
    }

    const closes = candles.map(c => {
        const val = c.close ?? c.c ?? c.Close ?? 0;
        return typeof val === 'number' ? val : parseFloat(val) || 0;
    }).filter(v => v > 0);

    if (closes.length < 5) {
        return {
            score: 0,
            confidence: 10,
            rsi: 50,
            candles_validos: closes.length,
            direcao: 'NEUTRO',
            forca: 'FRACA',
            fatores: ['dados_invalidos'],
            fonte: 'manual_fallback'
        };
    }

    const ultimos = closes.slice(-5);
    const primeiros = closes.slice(0, 5);
    const mediaUltimos = ultimos.reduce((s, v) => s + v, 0) / ultimos.length;
    const mediaPrimeiros = primeiros.reduce((s, v) => s + v, 0) / primeiros.length;
    let score = mediaPrimeiros > 0 ? (mediaUltimos - mediaPrimeiros) / mediaPrimeiros : 0;
    score = Math.max(-1, Math.min(1, score));

    let rsi = 50;
    if (closes.length > 14) {
        let gains = 0, losses = 0;
        for (let i = closes.length - 15; i < closes.length - 1; i++) {
            const change = closes[i + 1] - closes[i];
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }
        if (losses > 0) {
            rsi = 100 - (100 / (1 + (gains / losses)));
        } else if (gains > 0) {
            rsi = 100;
        }
    }

    const confidence = Math.min(60, 20 + (closes.length * 0.5));

    return {
        score: Math.round(score * 100) / 100,
        confidence: Math.round(confidence),
        rsi: Math.round(rsi),
        candles_validos: closes.length,
        direcao: score > 0.15 ? 'COMPRA' : score < -0.15 ? 'VENDA' : 'NEUTRO',
        forca: Math.abs(score) > 0.5 ? 'FORTE' : Math.abs(score) > 0.25 ? 'MODERADA' : 'FRACA',
        fatores: ['manual_fallback'],
        fonte: 'manual_fallback'
    };
}

module.exports = { calculate, calcularScoreManual };

// ============================================================
// TESTE RÁPIDO
// ============================================================
if (require.main === module) {
    console.log('\n[QuantAdapter] 🧪 Executando testes...\n');

    const testCandles = [];
    for (let i = 0; i < 50; i++) {
        const base = 1.35 + (i * 0.0002);
        testCandles.push({
            open: base,
            high: base + 0.0005,
            low: base - 0.0005,
            close: base + (Math.random() - 0.5) * 0.002,
            volume: 1000 + Math.random() * 500
        });
    }

    (async () => {
        console.log('📊 Teste 1: Array de candles');
        const result1 = await calculate(testCandles);
        console.log('Resultado:', JSON.stringify(result1, null, 2));

        console.log('\n📊 Teste 2: Objeto com .candles');
        const result2 = await calculate({ candles: testCandles });
        console.log('Resultado:', JSON.stringify(result2, null, 2));

        console.log('\n✅ Testes concluídos!');
    })();
}