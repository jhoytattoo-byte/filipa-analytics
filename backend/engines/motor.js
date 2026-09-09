// ============================================================
// MOTOR DE DECISÃO — v19.0 (Matemática Pura)
// ============================================================
// A IA interpreta, mas a MATEMÁTICA decide.
// Este motor calcula a confiança (45% - 95%) e a qualidade (A, B, C, D).

function calcularScore(indicadores) {
    let score = 0;
    
    // Tendência
    if (indicadores.tendencia === 'ALTA') score += 2;
    if (indicadores.tendencia === 'BAIXA') score -= 2;
    
    // RSI
    if (indicadores.rsi < 30) score += 2;  // Sobrecomprado (oportunidade de compra)
    if (indicadores.rsi > 70) score -= 2;  // Sobrecomprado (oportunidade de venda)
    if (indicadores.rsi >= 50 && indicadores.rsi <= 70) score += 1; // Tendência de alta
    if (indicadores.rsi < 50 && indicadores.rsi >= 30) score -= 1; // Tendência de baixa
    
    // MACD (se existir)
    if (indicadores.macd > 0) score += 2;
    if (indicadores.macd < 0) score -= 2;
    
    // VWAP (se existir)
    if (indicadores.vwap_status === 'acima') score += 2;
    if (indicadores.vwap_status === 'abaixo') score -= 2;
    
    // Volume (se existir)
    if (indicadores.volume_status === 'crescente') score += 1;
    if (indicadores.volume_status === 'decrescente') score -= 1;
    
    // Suporte/Resistência (se existir)
    if (indicadores.suporte_status === 'forte') score += 1;
    if (indicadores.resistencia_status === 'forte') score -= 1;
    
    return score;
}

function calcularConfidence(score) {
    // Converte score em confiança (0 a 100)
    let confidence = 50;
    confidence += score * 5;
    
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

module.exports = { calcularScore, calcularConfidence, calcularQualidade, calcularDirecao };