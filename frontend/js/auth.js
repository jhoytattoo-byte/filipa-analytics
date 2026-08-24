// js/auth.js — CORRIGIDO v8.0
// Não depende de FilipaState, trata erros gracefully, espera sessão persistir

// ============================================
// CONFIGURAÇÃO - SUBSTITUA SUA CHAVE AQUI
// ============================================
const SUPABASE_URL = 'https://bmpvtxjmbizskyaqyfhe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcHZ0eGptYml6c2t5YXF5ZmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTg0NjMsImV4cCI6MjEwMDIzNDQ2M30.k8Xpdek9iKivYdtDTpve_kcl6Nw2wPmCSL61Ky7Qq-M';

// ============================================
// CLIENTE SUPABASE (singleton)
// ============================================
let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient) {
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Biblioteca Supabase não carregada');
            return null;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });
        window.supabaseClient = supabaseClient;
    }
    return supabaseClient;
}

// ============================================
// VERIFICAR AUTH - COM RETRY E DELAY
// ============================================
async function verificarAuth() {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.error('❌ Supabase client não disponível');
        // Não redireciona imediatamente - pode ser só delay de carregamento
        setTimeout(() => window.location.href = 'login.html', 3000);
        return;
    }

    // Aguarda um pouco para o Supabase carregar sessão do localStorage
    let tentativas = 0;
    let session = null;

    while (tentativas < 10) {
        try {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.warn('⚠️  getSession erro (tentativa ' + (tentativas + 1) + '):', error.message);
            } else if (data.session) {
                session = data.session;
                console.log('✅ Sessão encontrada na tentativa', tentativas + 1);
                break;
            }
        } catch (err) {
            console.warn('⚠️  getSession exceção (tentativa ' + (tentativas + 1) + '):', err);
        }

        tentativas++;
        if (tentativas < 10) {
            await new Promise(r => setTimeout(r, 300)); // Espera 300ms entre tentativas
        }
    }

    if (!session) {
        console.error('❌ Nenhuma sessão encontrada após ' + tentativas + ' tentativas');
        window.location.href = 'login.html';
        return;
    }

    // ✅ SESSÃO VÁLIDA - Atualiza UI
    try {
        const userName = session.user.user_metadata?.nome || 
                        session.user.user_metadata?.name || 
                        session.user.email.split('@')[0];

        // Atualizar UI se elementos existirem
        const userNameElem = document.getElementById('userName');
        const userAvatarElem = document.getElementById('userAvatar');
        const userEmailElem = document.getElementById('userEmail');

        if (userNameElem) userNameElem.innerText = userName;
        if (userAvatarElem) userAvatarElem.innerText = userName.charAt(0).toUpperCase();
        if (userEmailElem) userEmailElem.innerText = session.user.email;

        // Salva no localStorage como backup (se FilipaState não existir)
        if (typeof FilipaState === 'undefined') {
            localStorage.setItem('filipa_user_backup', JSON.stringify({
                name: userName,
                email: session.user.email,
                id: session.user.id,
                plan: session.user.user_metadata?.plano || 'free'
            }));
        } else {
            // Usa FilipaState se disponível
            const userData = {
                name: userName,
                email: session.user.email,
                id: session.user.id,
                plan: session.user.user_metadata?.plano || 'free',
                loginDate: new Date().toISOString()
            };
            const current = FilipaState.user || {};
            if (!current.name || current.name === 'Trader' || current.email !== userData.email) {
                FilipaState.setUser(userData);
            }
        }

        console.log('✅ Usuário autenticado:', userName);

    } catch (err) {
        console.error('❌ Erro ao atualizar UI:', err);
        // Não redireciona - a sessão é válida mesmo se UI falhar
    }
}

// ============================================
// LOGOUT
// ============================================
function setupLogout() {
    const btnSair = document.getElementById('btnSair') || document.getElementById('btnExit');
    if (btnSair) {
        btnSair.addEventListener('click', async () => {
            const supabase = getSupabaseClient();
            if (supabase) {
                await supabase.auth.signOut();
            }
            localStorage.removeItem('filipa_user_backup');
            window.location.href = 'login.html';
        });
    }
}

// ============================================
// INICIALIZAR
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupLogout();
        verificarAuth();
    });
} else {
    setupLogout();
    verificarAuth();
}

console.log('✅ Auth v8.0 carregado — robusto, com retry e sem dependência de FilipaState');