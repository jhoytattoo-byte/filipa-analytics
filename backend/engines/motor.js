// ============================================================
// MOTOR DE DECISÃO — v19.1 (Matemática Pura, SEM DEPENDER DA IA)
// ============================================================

function calcularScore(indicadores) {
    let score = 0;
    
    // Tendência (peso 3)
    if (indicadores.tendencia === 'ALTA') score += 3;
    if (indicadores.tendencia === 'BAIXA') score -= 3;
    
    // RSI (peso 2)
    if (indicadores.rsi < 30) score += 2;  // Sobrecomprado
    if (indicadores.rsi > 70) score -= 2;  // Sobrecomprado
    if (indicadores.rsi >= 50 && indicadores.rsi <= 70) score += 1; // Forte alta
    if (indicadores.rsi < 50 && indicadores.rsi >= 30) score -= 1; // Forte baixa
    
    // MACD (peso 2)
    if (indicadores.macd > 0) score += 2;
    if (indicadores.macd < 0) score -= 2;
    
    // VWAP (peso 2)
    if (indicadores.vwap_status === 'acima') score += 2;
    if (indicadores.vwap_status === 'abaixo') score -= 2;
    
    // Volume (peso 1)
    if (indicadores.volume_status === 'crescente') score += 1;
    if (indicadores.volume_status === 'decrescente') score -= 1;
    
    // Suporte/Resistência (peso 1)
    if (indicadores.suporte_status === 'forte') score += 1;
    if (indicadores.resistencia_status === 'forte') score -= 1;
    
    return Math.max(-15, Math.min(15, score)); // Limite máximo de -15 a +15
}

function calcularConfidence(score) {
    // Converte score em confiança (45% a 95%)
    let confidence = 50;
    confidence += score * 4;
    
    return Math.max(45, Math.min(95, confidence));
}

function calcularQualidade(score, confidence, dadosCompletos) {
    if (dadosCompletos && score >= 8 && confidence >= 80) return 'A';
    if (score >= 4 && confidence >= 65) return 'B';
    if (score >= 1 && confidence >= 55) return 'C';
    return 'D';
}

function calcularDirecao(score) {
    if (score >= 3) return 'COMPRA';
    if (score <= -3) return 'VENDA';
    return 'AGUARDAR';
}

function calcularJustificativa(score, direcao) {
    if (direcao === 'AGUARDAR') {
        return `Score ${score} (fraco). Sem confluência de indicadores. Aguarde um sinal mais forte com score ≥ +5 ou ≤ -5.`;
    }
    return `Score ${score}. Confluência de indicadores detectada.`;
}

module.exports = { calcularScore, calcularConfidence, calcularQualidade, calcularDirecao, calcularJustificativa };