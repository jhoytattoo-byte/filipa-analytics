// ============================================================
// MOTOR DE DECISÃO — v20.0 (Matemática Pura + SuperTrend)
// ============================================================

function calcularScore(indicadores = {}) {
    let score = 0;
    
    // 1. TENDÊNCIA — peso 3
    if (indicadores.tendencia === 'ALTA') score += 3;
    if (indicadores.tendencia === 'BAIXA') score -= 3;
    
    // 2. RSI — peso 2
    const rsi = Number(indicadores.rsi);
    if (Number.isFinite(rsi)) {
        if (rsi < 30) score += 2;
        else if (rsi > 70) score -= 2;
        else if (rsi >= 55 && rsi <= 70) score += 1;
        else if (rsi >= 30 && rsi < 45) score -= 1;
    }
    
    // 3. MACD — peso 2
    const macd = Number(indicadores.macd);
    if (Number.isFinite(macd)) {
        if (macd > 0) score += 2;
        if (macd < 0) score -= 2;
    }
    
    // 4. VWAP — peso 2
    if (indicadores.vwap_status === 'acima') score += 2;
    if (indicadores.vwap_status === 'abaixo') score -= 2;
    
    // 5. SUPERTREND — peso 3 (NOVO!)
    if (indicadores.supertrend_status === 'compra') score += 3;
    if (indicadores.supertrend_status === 'venda') score -= 3;
    
    // 6. VOLUME — peso 1
    if (indicadores.volume_status === 'crescente') score += 1;
    if (indicadores.volume_status === 'decrescente') score -= 1;
    
    // 7. SUPORTE / RESISTÊNCIA — peso 1
    if (indicadores.suporte_status === 'forte') score += 1;
    if (indicadores.resistencia_status === 'forte') score -= 1;
    
    return Math.max(-15, Math.min(15, score));
}

function calcularConfidence(score) {
    const magnitude = Math.abs(Number(score) || 0);
    let confidence = 50;
    confidence += magnitude * 4;
    return Math.max(50, Math.min(95, confidence));
}

function calcularQualidade(score, confidence, dadosCompletos = true) {
    const magnitude = Math.abs(Number(score) || 0);
    if (dadosCompletos && magnitude >= 8 && confidence >= 80) return 'A';
    if (magnitude >= 4 && confidence >= 65) return 'B';
    if (magnitude >= 2 && confidence >= 55) return 'C';
    return 'D';
}

function calcularDirecao(score) {
    const valor = Number(score) || 0;
    // ✅ REGRA CORRETA: Só entra com score >= +5 ou <= -5
    if (valor >= 5) return 'COMPRA';
    if (valor <= -5) return 'VENDA';
    return 'AGUARDAR';
}

function calcularJustificativa(score, direcao) {
    const valor = Number(score) || 0;
    if (direcao === 'AGUARDAR') {
        return `Score ${valor}. Confluência insuficiente para entrada. A FILIPA aguarda score ≥ +5 ou ≤ -5.`;
    }
    if (direcao === 'COMPRA') {
        return `Score +${valor}. Confluência compradora suficiente para COMPRA.`;
    }
    if (direcao === 'VENDA') {
        return `Score ${valor}. Confluência vendedora suficiente para VENDA.`;
    }
    return `Score ${valor}. Sem direção definida.`;
}

function calcularStopLoss(preco, direcao, supertrendValor, config = {}) {
    // Se o SuperTrend foi detectado, usa ele como Stop Loss
    if (supertrendValor && !isNaN(supertrendValor)) {
        return supertrendValor;
    }
    // Caso contrário, usa o Stop Loss padrão (100 pts)
    const slPoints = config.risk?.default_sl_points || 100;
    return direcao === 'VENDA' ? preco + slPoints : preco - slPoints;
}

module.exports = { 
    calcularScore, 
    calcularConfidence, 
    calcularQualidade, 
    calcularDirecao, 
    calcularJustificativa,
    calcularStopLoss
};