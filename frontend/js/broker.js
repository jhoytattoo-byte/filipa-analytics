// MÓDULO CORRETORA
document.getElementById('btnAbrirCorretora').onclick = () => {
    let url = document.getElementById('urlCorretora').value.trim();
    if (!url) {
        adicionarAlerta('Digite o link da sua corretora', 'warning');
        return;
    }
    if (!url.startsWith('http')) url = 'https://' + url;
    window.open(url, '_blank', 'width=1400,height=900');
    adicionarAlerta(`Corretora aberta: ${url}`, 'success');
};

console.log('✅ Broker inicializado');