// NAVEGAÇÃO ENTRE ABAS
document.querySelectorAll('.nav-item').forEach(item => {
    item.onclick = () => {
        const pane = item.dataset.pane;
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        document.querySelectorAll('.content-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(pane + 'Pane').classList.add('active');
        document.getElementById('pageTitle').innerText = item.innerText.trim();
    };
});

console.log('✅ Navigation inicializado');