// services/priceHelper.js
function getPrecoAtual(candles) {
  if (!Array.isArray(candles) || candles.length === 0) return { preco: null, fonte: 'Indisponivel', confiavel: false };
  const u = candles[0];
  const close = parseFloat(u.close ?? u.c ?? u.fechamento ?? u.Close ?? 0);
  if (!isNaN(close) && close > 0) return { preco: Math.round(close*1e5)/1e5, fonte: 'Ultimo close', confiavel: true };
  return { preco: null, fonte: 'Indisponivel', confiavel: false };
}

function calcularSLTP(direcao, precoAtual, riscoPips=null, rewardRatio=1.5) {
  if (!precoAtual || precoAtual <= 0) return { sl: null, tp: null, rr: null, erro: 'Preco invalido' };
  let r = riscoPips;
  if (!r) { if (precoAtual > 100) r = 0.5; else if (precoAtual > 1) r = 0.005; else r = 0.0005; }
  const sl = direcao === 'COMPRA' ? precoAtual - r : precoAtual + r;
  const tp = direcao === 'COMPRA' ? precoAtual + (r * rewardRatio) : precoAtual - (r * rewardRatio);
  return { sl: Math.round(sl*1e5)/1e5, tp: Math.round(tp*1e5)/1e5, rr: `1:${rewardRatio}`, precoBase: precoAtual, riscoAplicado: r };
}

module.exports = { getPrecoAtual, calcularSLTP };