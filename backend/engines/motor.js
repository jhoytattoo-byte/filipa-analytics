// ============================================================
// MOTOR DE DECISÃO — v22.0 (Matemática Pura + Multi-Mercado)
// ============================================================
// A IA interpreta, mas a MATEMÁTICA decide.
// Este motor calcula a confiança (50% - 95%) e a qualidade (A, B, C, D).
// ============================================================

// ============================================================
// HELPER: Formatar preço com base no tipo de ativo
// ============================================================
function formatarPreco(preco, ativo) {
    const num = parseFloat(preco);
    if (!Number.isFinite(num)) return 0;
    
    const ativoUpper = (ativo || '').toUpperCase();
    
    // B3: WIN, WDO, BIT, ETH, SOL, GLD → arredonda para inteiro
    if (ativoUpper.includes('WIN') || ativoUpper.includes('WDO') || 
        ativoUpper.includes('BIT') || ativoUpper.includes('ETH') || 
        ativoUpper.includes('SOL') || ativoUpper.includes('GLD') ||
        ativoUpper.includes('PETR') || ativoUpper.includes('VALE') || 
        ativoUpper.includes('ITUB')) {
        return Math.round(num);
    }
    
    // OTC, Forex, Cripto, Ações → mantém casas decimais
    return num;
}

// ============================================================
// HELPER: Calcular Stop Loss dinâmico
// ============================================================
function calcularStopLoss(preco, direcao, ativo, supertrendValor, config = {}) {
    const ativoUpper = (ativo || '').toUpperCase();
    
    // Se o SuperTrend foi detectado E é válido, usa ele como Stop Loss
    if (supertrendValor && !isNaN(supertrendValor) && supertrendValor > 0) {
        // Garante que o SL está do lado correto
        if (direcao === 'COMPRA' && supertrendValor < preco) {
            return formatarPreco(supertrendValor, ativo);
        }
        if (direcao === 'VENDA' && supertrendValor > preco) {
            return formatarPreco(supertrendValor, ativo);
        }
    }
    
    // ✅ FALLBACK: Usa o Stop Loss padrão com base no tipo de ativo
    let slPoints = 100; // Padrão B3
    
    if (ativoUpper.includes('OTC') || ativoUpper.includes('FOREX') || 
        ativoUpper.includes('USD') || ativoUpper.includes('EUR') ||
        ativoUpper.includes('GBP') || ativoUpper.includes('JPY')) {
        slPoints = 0.000500; // 50 pips para Forex/OTC
    } else if (ativoUpper.includes('DE40') || ativoUpper.includes('DAX') ||
               ativoUpper.includes('FTSE') || ativoUpper.includes('NIKKEI') ||
               ativoUpper.includes('JP225') || ativoUpper.includes('HANG')) {
        slPoints = 50; // 50 pontos para índices
    } else if (ativoUpper.includes('BTC') || ativoUpper.includes('ETH') || 
               ativoUpper.includes('SOL')) {
        slPoints = 100; // 100 pontos para cripto
    } else if (ativoUpper.includes('XAU') || ativoUpper.includes('WTI')) {
        slPoints = 1.00; // 1 dólar para commodities
    } else if (ativoUpper.includes('AAPL') || ativoUpper.includes('TSLA') || 
               ativoUpper.includes('NVDA') || ativoUpper.includes('MSFT')) {
        slPoints = 1.00; // 1 dólar para ações
    }
    
    // ✅ Garante que o SL está do lado correto
    const stopLoss = direcao === 'VENDA' ? preco + slPoints : preco - slPoints;
    
    return stopLoss;
}

// ============================================================
// HELPER: Calcular Take Profit (R/R 1:2)
// ============================================================
function calcularTakeProfit(preco, direcao, stopLoss, ativo) {
    const risco = Math.abs(preco - stopLoss);
    
    // Se o risco for 0 ou inválido, usa um valor padrão
    if (risco === 0 || isNaN(risco)) {
        return direcao === 'VENDA' ? preco - 100 : preco + 100;
    }
    
    const recompensa = risco * 2; // R/R 1:2
    
    return direcao === 'VENDA' ? preco - recompensa : preco + recompensa;
}

// ============================================================
// SCORE — Matemática Pura
// ============================================================
function calcularScore(indicadores = {}) {
    let score = 0;
    
    // 1. TENDÊNCIA MACRO — peso 3
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
    
    // 5. SUPERTREND SIMPLES — peso 3
    if (indicadores.supertrend_status === 'compra') score += 3;
    if (indicadores.supertrend_status === 'venda') score -= 3;
    
    // 6. SUPERTREND TRIPLO — peso 5 (ALINHAMENTO TOTAL)
    const stCurto = indicadores.supertrend_curto;
    const stMedio = indicadores.supertrend_medio;
    const stLongo = indicadores.supertrend_longo;
    
    if (stCurto === 'compra' && stMedio === 'compra' && stLongo === 'compra') {
        score += 5;
    }
    if (stCurto === 'venda' && stMedio === 'venda' && stLongo === 'venda') {
        score -= 5;
    }
    
    // 7. VOLUME — peso 1
    if (indicadores.volume_status === 'crescente') score += 1;
    if (indicadores.volume_status === 'decrescente') score -= 1;
    
    // 8. SUPORTE / RESISTÊNCIA — peso 1
    if (indicadores.suporte_status === 'forte') score += 1;
    if (indicadores.resistencia_status === 'forte') score -= 1;
    
    return Math.max(-20, Math.min(20, score));
}

// ============================================================
// CONFIANÇA
// ============================================================
function calcularConfidence(score) {
    const magnitude = Math.abs(Number(score) || 0);
    let confidence = 50;
    confidence += magnitude * 4;
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
    if (valor >= 0) return 'COMPRA';
    if (valor < 0) return 'VENDA';
    return 'COMPRA';
}

// ============================================================
// JUSTIFICATIVA
// ============================================================
function calcularJustificativa(score, direcao) {
    const valor = Number(score) || 0;
    const magnitude = Math.abs(valor);
    
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
// RISCOS
// ============================================================
function calcularRiscos(score, direcao, indicadores = {}) {
    let riscos = [];
    const magnitude = Math.abs(score);
    
    if (magnitude < 6) {
        riscos.push('Confiança baixa. Sinal fraco.');
    }
    
    const rsi = Number(indicadores.rsi);
    if (rsi > 70) riscos.push('RSI sobrecomprado. Possível reversão.');
    if (rsi < 30) riscos.push('RSI sobrevendido. Possível reversão.');
    
    if (indicadores.tendencia === 'ALTA' && direcao === 'VENDA') {
        riscos.push('Tendência de alta contra a venda.');
    }
    if (indicadores.tendencia === 'BAIXA' && direcao === 'COMPRA') {
        riscos.push('Tendência de baixa contra a compra.');
    }
    
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
    
    if (riscos.length === 0) {
        riscos.push('Riscos não identificados. Sinal forte.');
    }
    
    return riscos.join(' | ');
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
    calcularStopLoss,
    calcularTakeProfit,
    formatarPreco
};