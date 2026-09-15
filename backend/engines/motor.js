// ============================================================
// MOTOR DE DECISÃO — v21.0 (Matemática Pura + SuperTrend Triplo)
// ============================================================
// A IA interpreta, mas a MATEMÁTICA decide.
// Este motor calcula a confiança (50% - 95%) e a qualidade (A, B, C, D).
// ============================================================

function calcularScore(indicadores = {}) {
    let score = 0;
    
    // ============================================================
    // 1. TENDÊNCIA MACRO — peso 3
    // ============================================================
    if (indicadores.tendencia === 'ALTA') score += 3;
    if (indicadores.tendencia === 'BAIXA') score -= 3;
    
    // ============================================================
    // 2. RSI — peso 2
    // ============================================================
    const rsi = Number(indicadores.rsi);
    if (Number.isFinite(rsi)) {
        if (rsi < 30) score += 2;           // Sobrevendido (compra)
        else if (rsi > 70) score -= 2;      // Sobrecomprado (venda)
        else if (rsi >= 55 && rsi <= 70) score += 1;  // Força compradora
        else if (rsi >= 30 && rsi < 45) score -= 1;   // Força vendedora
    }
    
    // ============================================================
    // 3. MACD — peso 2
    // ============================================================
    const macd = Number(indicadores.macd);
    if (Number.isFinite(macd)) {
        if (macd > 0) score += 2;
        if (macd < 0) score -= 2;
    }
    
    // ============================================================
    // 4. VWAP — peso 2
    // ============================================================
    if (indicadores.vwap_status === 'acima') score += 2;
    if (indicadores.vwap_status === 'abaixo') score -= 2;
    
    // ============================================================
    // 5. SUPERTREND SIMPLES — peso 3
    // ============================================================
    if (indicadores.supertrend_status === 'compra') score += 3;
    if (indicadores.supertrend_status === 'venda') score -= 3;
    
    // ============================================================
    // 6. SUPERTREND TRIPLO — peso 5 (ALINHAMENTO TOTAL)
    // ============================================================
    const stCurto = indicadores.supertrend_curto;
    const stMedio = indicadores.supertrend_medio;
    const stLongo = indicadores.supertrend_longo;
    
    // ✅ COMPRA: As 3 linhas estão verdes (alinhamento total de alta)
    if (stCurto === 'compra' && stMedio === 'compra' && stLongo === 'compra') {
        score += 5;
    }
    
    // ✅ VENDA: As 3 linhas estão vermelhas (alinhamento total de baixa)
    if (stCurto === 'venda' && stMedio === 'venda' && stLongo === 'venda') {
        score -= 5;
    }
    
    // ============================================================
    // 7. VOLUME — peso 1
    // ============================================================
    if (indicadores.volume_status === 'crescente') score += 1;
    if (indicadores.volume_status === 'decrescente') score -= 1;
    
    // ============================================================
    // 8. SUPORTE / RESISTÊNCIA — peso 1
    // ============================================================
    if (indicadores.suporte_status === 'forte') score += 1;
    if (indicadores.resistencia_status === 'forte') score -= 1;
    
    // ============================================================
    // LIMITADOR (Score máximo: -20 a +20)
    // ============================================================
    return Math.max(-20, Math.min(20, score));
}

// ============================================================
// CONFIANÇA
// ============================================================
function calcularConfidence(score) {
    const magnitude = Math.abs(Number(score) || 0);
    let confidence = 50;
    confidence += magnitude * 4;  // ✅ Aumentado para 4
    return Math.max(50, Math.min(95, confidence));
}

// ============================================================
// QUALIDADE
// ============================================================
function calcularQualidade(score, confidence, dadosCompletos = true) {
    const magnitude = Math.abs(Number(score) || 0);
    
    if (dadosCompletos && magnitude >= 8 && confidence >= 80) return 'A';
    if (magnitude >= 4 && confidence >= 65) return 'B';
    if (magnitude >= 2 && confidence >= 55) return 'C';
    return 'D';
}

// ============================================================
// DIREÇÃO
// ============================================================
function calcularDirecao(score) {
    const valor = Number(score) || 0;
    
    // ✅ SEMPRE DÁ UMA DIREÇÃO (nunca AGUARDAR)
    // Se o score for positivo ou zero, é COMPRA
    // Se o score for negativo, é VENDA
    if (valor >= 0) return 'COMPRA';
    if (valor < 0) return 'VENDA';
    return 'COMPRA'; // Fallback
}

// ============================================================
// JUSTIFICATIVA
// ============================================================
function calcularJustificativa(score, direcao) {
    const valor = Number(score) || 0;
    const magnitude = Math.abs(valor);
    
    // Sempre mostra a direção e a força do sinal
    if (direcao === 'COMPRA') {
        if (magnitude >= 8) return `Score +${valor}. Confluência compradora FORTE. Sinal de alta confiança.`;
        if (magnitude >= 4) return `Score +${valor}. Confluência compradora MODERADA. Sinal médio.`;
        return `Score +${valor}. Confluência compradora FRACA. Sinal de baixa confiança. Opere com cautela.`;
    }
    
    if (direcao === 'VENDA') {
        if (magnitude >= 8) return `Score ${valor}. Confluência vendedora FORTE. Sinal de alta confiança.`;
        if (magnitude >= 4) return `Score ${valor}. Confluência vendedora MODERADA. Sinal médio.`;
        return `Score ${valor}. Confluência vendedora FRACA. Sinal de baixa confiança. Opere com cautela.`;
    }
    
    return `Score ${valor}. Sem direção definida.`;
}

// ============================================================
// CÁLCULO DE RISCOS
// ============================================================
function calcularRiscos(score, direcao, indicadores = {}) {
    let riscos = [];
    const magnitude = Math.abs(score);
    
    // Score fraco
    if (magnitude < 6) {
        riscos.push('Confiança baixa. Sinal fraco.');
    }
    
    // RSI sobrecomprado/sobrevendido
    const rsi = Number(indicadores.rsi);
    if (rsi > 70) riscos.push('RSI sobrecomprado. Possível reversão.');
    if (rsi < 30) riscos.push('RSI sobrevendido. Possível reversão.');
    
    // Tendência contra a direção
    if (indicadores.tendencia === 'ALTA' && direcao === 'VENDA') {
        riscos.push('Tendência de alta contra a venda.');
    }
    if (indicadores.tendencia === 'BAIXA' && direcao === 'COMPRA') {
        riscos.push('Tendência de baixa contra a compra.');
    }
    
    // SuperTrends desalinhados
    const stCurto = indicadores.supertrend_curto;
    const stMedio = indicadores.supertrend_medio;
    const stLongo = indicadores.supertrend_longo;
    
    if (stCurto && stMedio && stLongo) {
        const todosCompra = stCurto === 'compra' && stMedio === 'compra' && stLongo === 'compra';
        const todosVenda = stCurto === 'venda' && stMedio === 'venda' && stLongo === 'venda';
        
        if (!todosCompra && !todosVenda) {
            riscos.push('SuperTrends desalinhados. Aguarde confluência.');
        }
    }
    
    // Se não há riscos detectados
    if (riscos.length === 0) {
        riscos.push('Riscos não identificados. Sinal forte.');
    }
    
    return riscos.join(' | ');
}

// ============================================================
// STOP LOSS DINÂMICO (usa SuperTrend se disponível)
// ============================================================
function calcularStopLoss(preco, direcao, supertrendValor, config = {}) {
    // Se o SuperTrend foi detectado, usa ele como Stop Loss
    if (supertrendValor && !isNaN(supertrendValor)) {
        return supertrendValor;
    }
    
    // Caso contrário, usa o Stop Loss padrão (100 pts)
    const slPoints = config.risk?.default_sl_points || 100;
    return direcao === 'VENDA' ? preco + slPoints : preco - slPoints;
}

// ============================================================
// EXPORT
// ============================================================
module.exports = { 
    calcularScore, 
    calcularConfidence, 
    calcularQualidade, 
    calcularDirecao, 
    calcularJustificativa,
    calcularRiscos,
    calcularStopLoss
};