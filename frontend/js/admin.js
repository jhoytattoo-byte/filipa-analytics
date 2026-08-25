// ============================================================
// ADMIN v5.1 — SUPABASE NATIVO (Frontend-only) VERSÃO CORRIGIDA
// ============================================================

const Admin = {
    users: [],
    costs: { groq: 0, deepseek: 0, claude: 0, total: 0 },
    costLimit: 50,
    isAdmin: false,
    supabase: null, // Será preenchido pelo window.supabaseClient
    currentUser: null,
    ADMIN_EMAIL: 'contato.multsystem@gmail.com',
    initAttempts: 0,
    maxInitAttempts: 20,

    init() {
        console.log('🔐 Admin v5.1 iniciando...');
        this.initAttempts++;

        if (!window.supabaseClient) {
            if (this.initAttempts < this.maxInitAttempts) {
                console.log('[Admin] Aguardando supabaseClient... tentativa', this.initAttempts);
                setTimeout(() => this.init(), 500);
                return;
            }
            console.error('[Admin] ❌ supabaseClient não disponível após', this.maxInitAttempts, 'tentativas');
            return;
        }

        this.supabase = window.supabaseClient;
        console.log('[Admin] ✅ supabaseClient conectado');
        this.checkAdmin();
    },

    async checkAdmin() {
        try {
            console.log('[Admin] Verificando usuário logado...');
            const { data: { user }, error } = await this.supabase.auth.getUser();

            if (error) {
                console.error('[Admin] ❌ Erro getUser:', error.message);
                return;
            }

            if (!user) {
                console.log('[Admin] ⚠️ Nenhum usuário logado');
                return;
            }

            this.currentUser = user;
            console.log('[Admin] Logado:', user.email);

            this.isAdmin = user.email === this.ADMIN_EMAIL;
            console.log('[Admin] isAdmin:', this.isAdmin);

            if (this.isAdmin) {
                console.log('[Admin] ✅ ADMIN MASTER:', user.email);
                this.showAdminTab();
                await this.loadAllData();
                this.startRealtime();
            } else {
                console.log('[Admin] ❌ Acesso negado:', user.email);
                this.hideAdminTab();
                this.blockAdminAccess();
            }
        } catch (e) {
            console.error('[Admin] ❌ Erro checkAdmin:', e);
        }
    },

    showAdminTab() {
        const nav = document.querySelector('.nav-menu');
        if (!nav) {
            console.log('[Admin] nav-menu não encontrado');
            return;
        }

        let adminItem = document.querySelector('[data-pane="admin"]');
        if (adminItem) {
            console.log('[Admin] Aba Admin já existe');
            return;
        }

        adminItem = document.createElement('div');
        adminItem.className = 'nav-item';
        adminItem.setAttribute('data-pane', 'admin');
        adminItem.innerHTML = '🔐 Admin';
        adminItem.style.borderLeft = '3px solid #ffd700';
        adminItem.style.background = 'linear-gradient(90deg, rgba(255,215,0,.1), transparent)';

        adminItem.addEventListener('click', () => {
            if (window.Main && window.Main.navigateTo) {
                window.Main.navigateTo('admin');
            }
        });

        nav.appendChild(adminItem);
        console.log('[Admin] ✅ Aba Admin adicionada ao menu');
    },

    hideAdminTab() {
        const adminTab = document.querySelector('[data-pane="admin"]');
        if (adminTab) {
            adminTab.remove();
            console.log('[Admin] Aba Admin removida');
        }
    },

    blockAdminAccess() {
        const pane = document.getElementById('adminPane');
        if (pane && pane.classList.contains('active')) {
            const dashboardPane = document.getElementById('dashboardPane');
            if (dashboardPane) {
                pane.classList.remove('active');
                dashboardPane.classList.add('active');
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                const dashNav = document.querySelector('[data-pane="dashboard"]');
                if (dashNav) dashNav.classList.add('active');
                const titleEl = document.getElementById('pageTitle');
                if (titleEl) titleEl.textContent = 'Command Center';
            }
        }
    },

    async loadAllData() {
        console.log('[Admin] Carregando todos os dados...');
        await this.loadUsers();
        await this.loadStats();
        await this.loadCosts();
        this.renderLogs();
    },

    // ============================================================
    // LISTAR USUÁRIOS — Profiles + Usuarios
    // ============================================================
    async loadUsers() {
        try {
            console.log('[Admin] 🔄 Carregando usuários...');

            // 1. Buscar profiles (admins)
            let profiles = [];
            try {
                const { data, error } = await this.supabase
                    .from('profiles')
                    .select('id, email, nome, plano, status, total_trades, profit_total, created_at, updated_at, last_sign_in_at, role')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('[Admin] ⚠️ Erro profiles:', error.message);
                } else {
                    profiles = data || [];
                    console.log('[Admin] ✅ Profiles:', profiles.length);
                }
            } catch (e) {
                console.warn('[Admin] ⚠️ Exceção profiles:', e.message);
            }

            // 2. Buscar usuarios (tabela real do login)
            let usuarios = [];
            try {
                const { data, error } = await this.supabase
                    .from('usuarios')
                    .select('*')
                    .order('data_cadastro', { ascending: false });

                if (error) {
                    console.warn('[Admin] ⚠️ Erro usuarios:', error.message);
                    if (error.code === '42501' || error.message.includes('policy')) {
                        console.log('[Admin] ⚠️ RLS bloqueando — tente desativar no Supabase');
                    }
                } else {
                    usuarios = data || [];
                    console.log('[Admin] ✅ Usuarios:', usuarios.length);
                    if (usuarios.length > 0) {
                        console.log('[Admin] Primeiro usuario:', { 
                            id: usuarios[0].id, 
                            email: usuarios[0].email, 
                            nome: usuarios[0].nome,
                            plano: usuarios[0].plano 
                        });
                    }
                }
            } catch (e) {
                console.warn('[Admin] ⚠️ Exceção usuarios:', e.message);
            }

            // 3. Normalizar profiles
            const normalizedProfiles = profiles.map(p => ({
                id: p.id,
                email: p.email,
                nome: p.nome || p.email?.split('@')[0] || 'N/A',
                plano: p.plano || 'free',
                status: p.status || 'ativo',
                total_analyses: p.total_analyses || 0,
                total_trades: p.total_trades || 0,
                profit_total: parseFloat(p.profit_total) || 0,
                created_at: p.created_at,
                updated_at: p.updated_at,
                last_sign_in_at: p.last_sign_in_at || p.created_at,
                role: p.role || 'user',
                tipo: 'admin'
            }));

            // 4. Normalizar usuarios
            const normalizedUsuarios = usuarios.map(u => ({
                id: u.user_id || u.id,
                email: u.email,
                nome: u.nome || u.email?.split('@')[0] || 'N/A',
                plano: u.plano || 'free',
                status: u.status || 'ativo',
                total_analyses: u.total_analyses || 0,
                total_trades: u.total_trades || 0,
                profit_total: parseFloat(u.profit_total) || 0,
                created_at: u.data_cadastro || u.created_at,
                updated_at: u.data_cadastro || u.updated_at,
                last_sign_in_at: u.last_sign_in_at || u.data_cadastro,
                role: 'user',
                tipo: 'usuario'
            }));

            // 5. Mesclar e ordenar
            this.users = [...normalizedProfiles, ...normalizedUsuarios]
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

            console.log('[Admin] 📊 Total usuários:', this.users.length);
            this.users.forEach((u, i) => {
                console.log(`[Admin] #${i+1} [${u.tipo}] ${u.email} | plano:${u.plano} | status:${u.status}`);
            });

            this.renderUsers();

        } catch (e) {
            console.error('[Admin] ❌ Erro loadUsers geral:', e);
            this.users = [];
            this.renderUsers();
        }
    },

    renderUsers() {
        const tbody = document.getElementById('adminUsersTable');
        if (!tbody) {
            console.log('[Admin] adminUsersTable não encontrado');
            return;
        }

        if (this.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--muted)">Nenhum usuário encontrado. Cadastre um via login ou clique em "Sincronizar Auth".</td></tr>';
            return;
        }

        tbody.innerHTML = this.users.map(u => {
            const plano = (u.plano || 'free').toLowerCase();
            const status = (u.status || 'ativo').toLowerCase();
            const nome = u.nome || u.email?.split('@')[0] || 'N/A';
            const analises = u.total_analyses || 0;
            const trades = u.total_trades || 0;
            const profit = parseFloat(u.profit_total) || 0;
            const ultimo = u.last_sign_in_at 
                ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') 
                : (u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : 'Nunca');
            const isMaster = u.email === this.ADMIN_EMAIL;
            const tipo = u.tipo || 'admin';

            const planoColor = plano === 'master' ? '#ffd700' : 
                              plano === 'elite' ? '#c0c0c0' : 
                              plano === 'pro' ? '#00bfff' : '#9aa7bd';
            const statusColor = status === 'active' || status === 'ativo' ? '#00ff88' : 
                               status === 'suspenso' ? '#ffaa00' : '#ff4444';
            const profitColor = profit >= 0 ? '#00ff88' : '#ff4444';
            const tipoColor = tipo === 'admin' ? '#00bfff' : '#f59e0b';
            const tipoLabel = tipo === 'admin' ? '👤 Admin' : '⭐ Usuário';

            let actionsHtml;
            if (isMaster) {
                actionsHtml = '<span style="color:#ffd700;font-size:.75rem;font-weight:700;">👑 ADMIN MASTER</span>';
            } else if (tipo === 'usuario') {
                actionsHtml = `
                    <div style="display:flex;gap:6px;justify-content:center;">
                        <button onclick="Admin.toggleUsuarioStatus('${u.id}', '${status === 'ativo' ? 'suspenso' : 'ativo'}')" style="padding:4px 10px;background:${status === 'ativo' ? 'rgba(255,68,68,.15)' : 'rgba(0,255,136,.15)'};border:1px solid ${status === 'ativo' ? 'rgba(255,68,68,.3)' : 'rgba(0,255,136,.3)'};border-radius:6px;color:${status === 'ativo' ? '#ff4444' : '#00ff88'};font-size:.7rem;cursor:pointer;font-weight:600;">${status === 'ativo' ? 'Suspender' : 'Ativar'}</button>
                        <button onclick="Admin.editUsuario('${u.id}')" style="padding:4px 10px;background:rgba(0,191,255,.15);border:1px solid rgba(0,191,255,.3);border-radius:6px;color:#00bfff;font-size:.7rem;cursor:pointer;">✏️</button>
                        <button onclick="Admin.deleteUsuario('${u.id}')" style="padding:4px 10px;background:rgba(255,68,68,.15);border:1px solid rgba(255,68,68,.3);border-radius:6px;color:#ff4444;font-size:.7rem;cursor:pointer;">🗑️</button>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div style="display:flex;gap:6px;justify-content:center;">
                        <button onclick="Admin.toggleUserStatus('${u.id}', '${status === 'ativo' ? 'suspenso' : 'ativo'}')" style="padding:4px 10px;background:${status === 'ativo' ? 'rgba(255,68,68,.15)' : 'rgba(0,255,136,.15)'};border:1px solid ${status === 'ativo' ? 'rgba(255,68,68,.3)' : 'rgba(0,255,136,.3)'};border-radius:6px;color:${status === 'ativo' ? '#ff4444' : '#00ff88'};font-size:.7rem;cursor:pointer;font-weight:600;">${status === 'ativo' ? 'Suspender' : 'Ativar'}</button>
                        <button onclick="Admin.editUser('${u.id}')" style="padding:4px 10px;background:rgba(0,191,255,.15);border:1px solid rgba(0,191,255,.3);border-radius:6px;color:#00bfff;font-size:.7rem;cursor:pointer;">✏️</button>
                        <button onclick="Admin.deleteUser('${u.id}')" style="padding:4px 10px;background:rgba(255,68,68,.15);border:1px solid rgba(255,68,68,.3);border-radius:6px;color:#ff4444;font-size:.7rem;cursor:pointer;">🗑️</button>
                    </div>
                `;
            }

            const masterBadge = isMaster ? ' <span style="color:#ffd700;font-size:.7rem;">👑</span>' : '';

            return `
            <tr style="border-bottom:1px solid var(--border);transition:all .2s;${isMaster ? 'background:rgba(255,215,0,.05);' : ''}" onmouseover="this.style.background='${isMaster ? 'rgba(255,215,0,.08)' : 'rgba(255,255,255,.03)'}'" onmouseout="this.style.background='${isMaster ? 'rgba(255,215,0,.05)' : 'transparent'}'">
                <td style="padding:10px 8px;font-size:.8rem;">
                    <div style="font-weight:600;">${nome}${masterBadge}</div>
                    <div style="font-size:.7rem;color:var(--muted);">${u.email || 'N/A'}</div>
                </td>
                <td style="padding:10px 8px;">
                    <span style="padding:2px 8px;border-radius:4px;background:${tipoColor}22;color:${tipoColor};font-size:.7rem;font-weight:600;">${tipoLabel}</span>
                </td>
                <td style="padding:10px 8px;">
                    <select onchange="Admin.updateUserPlano('${u.id}', this.value)" style="background:transparent;border:1px solid var(--border);border-radius:6px;color:${planoColor};font-size:.8rem;padding:4px 8px;cursor:pointer;" ${isMaster ? 'disabled' : ''}>
                        <option value="free" ${plano === 'free' ? 'selected' : ''}>FREE</option>
                        <option value="pro" ${plano === 'pro' ? 'selected' : ''}>PRO</option>
                        <option value="elite" ${plano === 'elite' ? 'selected' : ''}>ELITE</option>
                        <option value="master" ${plano === 'master' ? 'selected' : ''}>MASTER</option>
                    </select>
                </td>
                <td style="padding:10px 8px;"><span style="color:${statusColor};font-size:.8rem;">● ${status}</span></td>
                <td style="padding:10px 8px;font-size:.8rem;text-align:center;">${analises}</td>
                <td style="padding:10px 8px;font-size:.8rem;text-align:center;">${trades}</td>
                <td style="padding:10px 8px;font-size:.8rem;text-align:right;color:${profitColor};font-weight:600;">${profit >= 0 ? '+' : ''}${profit.toFixed(2)}</td>
                <td style="padding:10px 8px;font-size:.8rem;color:var(--muted)">${ultimo}</td>
                <td style="padding:10px 8px;text-align:center;">${actionsHtml}</td>
            </tr>
            `;
        }).join('');
    },

    // ============================================================
    // SINCRONIZAR AUTH — Busca usuários do Supabase Auth e cria na tabela
    // ============================================================
    async syncAuthToProfiles() {
        console.log('[Admin] 🔄 Sincronizando Auth com tabelas...');

        try {
            const { data: authUsers, error: authError } = await this.supabase.auth.admin.listUsers();

            if (authError) {
                console.error('[Admin] ❌ Erro ao listar usuários do Auth:', authError);
                alert('❌ Não foi possível acessar a lista de usuários do Auth. Verifique as permissões.');
                return;
            }

            console.log('[Admin] Usuários no Auth:', authUsers?.users?.length || 0);

            if (!authUsers?.users || authUsers.users.length === 0) {
                alert('ℹ️ Nenhum usuário encontrado no Auth.');
                return;
            }

            let synced = 0;
            let errors = 0;

            for (const authUser of authUsers.users) {
                const email = authUser.email;
                const nome = authUser.user_metadata?.nome || email?.split('@')[0] || 'Usuário';
                const plano = authUser.user_metadata?.plano || 'free';
                const status = authUser.user_metadata?.status || 'ativo';

                try {
                    const { data: existing } = await this.supabase
                        .from('usuarios')
                        .select('id')
                        .eq('user_id', authUser.id)
                        .maybeSingle();

                    if (!existing) {
                        const { error: insertError } = await this.supabase
                            .from('usuarios')
                            .insert({
                                user_id: authUser.id,
                                email: email,
                                nome: nome,
                                plano: plano,
                                status: status,
                                data_cadastro: authUser.created_at || new Date().toISOString()
                            });

                        if (insertError) {
                            console.warn('[Admin] ⚠️ Erro ao inserir usuario:', insertError.message);
                            errors++;
                        } else {
                            synced++;
                            console.log('[Admin] ✅ Sincronizado:', email);
                        }
                    }

                    const { data: existingProfile } = await this.supabase
                        .from('profiles')
                        .select('id')
                        .eq('id', authUser.id)
                        .maybeSingle();

                    if (!existingProfile) {
                        await this.supabase
                            .from('profiles')
                            .insert({
                                id: authUser.id,
                                email: email,
                                nome: nome,
                                plano: plano,
                                status: status,
                                role: 'user',
                                created_at: new Date().toISOString()
                            });
                    }

                } catch (e) {
                    console.warn('[Admin] ⚠️ Erro ao sincronizar', email, ':', e.message);
                    errors++;
                }
            }

            alert(`✅ Sincronização concluída!\n📝 ${synced} usuários sincronizados\n❌ ${errors} erros`);
            this.addLog(`🔄 ${synced} usuários sincronizados do Auth`, 'success');

            await this.loadUsers();
            await this.loadStats();

        } catch (e) {
            console.error('[Admin] ❌ Erro syncAuthToProfiles:', e);
            alert('❌ Erro na sincronização: ' + e.message);
        }
    },

    // ============================================================
    // AÇÕES PARA USUARIOS
    // ============================================================
    async toggleUsuarioStatus(userId, newStatus) {
        try {
            const { error } = await this.supabase
                .from('usuarios')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (error) throw error;

            this.addLog('🔄 Usuário status → ' + newStatus, 'success');
            await this.loadUsers();

        } catch (e) {
            console.error('[Admin] Erro toggleUsuarioStatus:', e);
            alert('❌ Erro: ' + e.message);
        }
    },

    async editUsuario(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            alert('❌ Usuário não encontrado!');
            return;
        }

        const nome = prompt('✏️ Novo nome:', user.nome || '');
        if (nome === null) return;

        const plano = prompt('📊 Novo plano (free/pro/elite/master):', user.plano || 'free');
        if (plano === null) return;

        try {
            const { error } = await this.supabase
                .from('usuarios')
                .update({ nome, plano, updated_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (error) throw error;

            alert('✅ Usuário atualizado!');
            this.addLog('✏️ ' + user.email + ' atualizado', 'success');
            await this.loadUsers();

        } catch (e) {
            console.error('[Admin] Erro editUsuario:', e);
            alert('❌ Erro: ' + e.message);
        }
    },

    async deleteUsuario(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            alert('❌ Usuário não encontrado!');
            return;
        }

        const confirmMsg = `🗑️ EXCLUIR USUÁRIO\n\nNome: ${user.nome || user.email.split('@')[0]}\nEmail: ${user.email}\nPlano: ${(user.plano || 'free').toUpperCase()}\n\n⚠️ Esta ação não pode ser desfeita!\n\nDeseja realmente excluir?`;

        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await this.supabase
                .from('usuarios')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            alert('✅ Usuário ' + user.email + ' excluído!');
            this.addLog('🗑️ ' + user.email + ' excluído', 'warning');
            await this.loadUsers();
            await this.loadStats();

        } catch (e) {
            console.error('[Admin] Erro deleteUsuario:', e);
            alert('❌ Erro: ' + e.message);
        }
    },

    // ============================================================
    // AÇÕES PARA PROFILES (ADMINS)
    // ============================================================
    async showAddUserModal() {
        const nome = prompt('👤 Nome completo:');
        if (!nome) return;

        const email = prompt('📧 E-mail:');
        if (!email || !email.includes('@')) {
            alert('❌ E-mail inválido!');
            return;
        }
        if (email === this.ADMIN_EMAIL) {
            alert('❌ Este email é reservado para o admin master!');
            return;
        }

        const password = prompt('🔑 Senha (mínimo 6 caracteres):');
        if (!password || password.length < 6) {
            alert('❌ Senha deve ter no mínimo 6 caracteres');
            return;
        }

        const plano = prompt('📊 Plano (free/pro/elite/master):', 'free') || 'free';
        const planosValidos = ['free', 'pro', 'elite', 'master'];
        if (!planosValidos.includes(plano)) {
            alert('❌ Plano inválido!');
            return;
        }

        await this.createUser(nome, email, password, plano);
    },

    async createUser(nome, email, password, plano) {
        try {
            console.log('[Admin] Criando usuário:', email);

            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { nome: nome, plano: plano, status: 'active' }
                }
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    alert('❌ Este e-mail já está cadastrado!');
                } else {
                    alert('❌ Erro no Auth: ' + authError.message);
                }
                return;
            }

            if (!authData.user) {
                alert('❌ Erro ao criar usuário');
                return;
            }

            const { error: usuarioError } = await this.supabase
                .from('usuarios')
                .insert({
                    user_id: authData.user.id,
                    email: email,
                    nome: nome,
                    plano: plano,
                    status: 'ativo',
                    data_cadastro: new Date().toISOString()
                });

            if (usuarioError) {
                console.warn('[Admin] Erro usuarios:', usuarioError.message);
            }

            const { error: profileError } = await this.supabase
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    email: email,
                    nome: nome,
                    plano: plano,
                    status: 'ativo',
                    role: 'user',
                    created_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (profileError) {
                console.warn('[Admin] Erro profile:', profileError.message);
            }

            alert('✅ Usuário ' + email + ' criado com sucesso!');
            this.addLog('✅ ' + email + ' criado (' + plano + ')', 'success');
            await this.loadUsers();
            await this.loadStats();

        } catch (e) {
            console.error('[Admin] Erro criar usuário:', e);
            alert('❌ Erro: ' + e.message);
        }
    },

    async deleteUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            alert('❌ Usuário não encontrado!');
            return;
        }

        if (user.email === this.ADMIN_EMAIL) {
            alert('❌ Não é possível excluir o admin master!');
            return;
        }
        if (userId === this.currentUser?.id) {
            alert('❌ Você não pode excluir sua própria conta!');
            return;
        }

        const confirmMsg = `🗑️ EXCLUIR USUÁRIO\n\nNome: ${user.nome || user.email.split('@')[0]}\nEmail: ${user.email}\nPlano: ${(user.plano || 'free').toUpperCase()}\n\n⚠️ Esta ação não pode ser desfeita!\n\nDeseja realmente excluir?`;

        if (!confirm(confirmMsg)) return;

        try {
            const { error: profileError } = await this.supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (profileError) {
                await this.supabase.from('profiles').update({ status: 'excluido' }).eq('id', userId);
            }

            await this.supabase.from('usuarios').delete().eq('user_id', userId);

            alert('✅ Usuário ' + user.email + ' excluído!');
            this.addLog('🗑️ ' + user.email + ' excluído', 'warning');
            await this.loadUsers();
            await this.loadStats();

        } catch (e) {
            console.error('[Admin] Erro deleteUser:', e);
            alert('❌ Erro: ' + e.message);
        }
    },

    async editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) {
            alert('❌ Usuário não encontrado!');
            return;
        }

        if (user.email === this.ADMIN_EMAIL) {
            alert('❌ Não é possível editar o admin master!');
            return;
        }

        const nome = prompt('✏️ Novo nome:', user.nome || '');
        if (nome === null) return;

        const plano = prompt('📊 Novo plano (free/pro/elite/master):', user.plano || 'free');
        if (plano === null) return;

        try {
            const { error: profileError } = await this.supabase
                .from('profiles')
                .update({ nome, plano, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (profileError) throw profileError;

            alert('✅ Usuário atualizado!');
            this.addLog('✏️ ' + user.email + ' atualizado', 'success');
            await this.loadUsers();

        } catch (e) {
            console.error('[Admin] Erro editUser:', e);
            alert('❌ Erro: ' + e.message);
        }
    },

    async toggleUserStatus(userId, newStatus) {
        const user = this.users.find(u => u.id === userId);
        if (user && user.email === this.ADMIN_EMAIL) {
            alert('❌ Não é possível alterar o status do admin master!');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('profiles')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) throw error;

            this.addLog('🔄 Status → ' + newStatus, 'success');
            await this.loadUsers();

        } catch (e) {
            console.error('[Admin] Erro status:', e);
            alert('❌ Erro: ' + e.message);
        }
    },

    async updateUserPlano(userId, newPlano) {
        const user = this.users.find(u => u.id === userId);
        if (user && user.email === this.ADMIN_EMAIL) {
            alert('❌ Não é possível alterar o plano do admin master!');
            return;
        }

        try {
            const table = user?.tipo === 'usuario' ? 'usuarios' : 'profiles';
            const idField = user?.tipo === 'usuario' ? 'user_id' : 'id';

            const { error } = await this.supabase
                .from(table)
                .update({ plano: newPlano, updated_at: new Date().toISOString() })
                .eq(idField, userId);

            if (error) throw error;

            this.addLog('📊 Plano → ' + newPlano, 'success');
            await this.loadUsers();
            await this.loadStats();

        } catch (e) {
            console.error('[Admin] Erro plano:', e);
        }
    },

    // ============================================================
    // STATS
    // ============================================================
    async loadStats() {
        try {
            const totalUsers = this.users.length;
            this.setText('adminTotalUsers', totalUsers);

            const planoPrecos = { free: 0, pro: 39.90, elite: 79.90, master: 199.90 };
            const revenue = this.users.reduce((sum, u) => {
                const p = (u.plano || 'free').toLowerCase();
                return sum + (planoPrecos[p] || 0);
            }, 0);

            this.setText('adminRevenue', 'R$ ' + revenue.toFixed(2));

            const todayCost = this.costs.total || 0;
            this.setText('adminAICost', 'R$ ' + todayCost.toFixed(2));

            const profit = revenue - todayCost;
            const profitEl = document.getElementById('adminProfit');
            if (profitEl) {
                profitEl.textContent = 'R$ ' + profit.toFixed(2);
                profitEl.style.color = profit >= 0 ? '#00ff88' : '#ff4444';
            }
        } catch (e) {
            console.error('[Admin] Erro stats:', e);
        }
    },

    // ============================================================
    // CUSTOS
    // ============================================================
    async loadCosts() {
        try {
            const groq = parseFloat(localStorage.getItem('cost_groq') || 0);
            const deepseek = parseFloat(localStorage.getItem('cost_deepseek') || 0);
            const claude = parseFloat(localStorage.getItem('cost_claude') || 0);
            this.costs = { groq, deepseek, claude, total: groq + deepseek + claude };
            this.renderCosts();
        } catch (e) {
            console.error('[Admin] Erro custos:', e);
        }
    },

    renderCosts() {
        const groqEl = document.getElementById('costGroq');
        const dsEl = document.getElementById('costDeepSeek');
        const claudeEl = document.getElementById('costClaude');
        const totalEl = document.getElementById('costTotal');
        const barEl = document.getElementById('costBar');
        const limitEl = document.getElementById('costLimit');

        if (groqEl) groqEl.textContent = 'R$ ' + (this.costs.groq || 0).toFixed(2);
        if (dsEl) dsEl.textContent = 'R$ ' + (this.costs.deepseek || 0).toFixed(2);
        if (claudeEl) claudeEl.textContent = 'R$ ' + (this.costs.claude || 0).toFixed(2);
        if (totalEl) totalEl.textContent = 'R$ ' + (this.costs.total || 0).toFixed(2);
        if (limitEl) limitEl.textContent = 'R$ ' + this.costLimit.toFixed(2);

        if (barEl) {
            const pct = Math.min(100, ((this.costs.total || 0) / this.costLimit) * 100);
            barEl.style.width = pct + '%';
            barEl.style.background = pct > 80 ? 'linear-gradient(90deg,#ff4444,#cc3333)' : 
                                      pct > 50 ? 'linear-gradient(90deg,#ffaa00,#cc8800)' : 
                                      'linear-gradient(90deg,#00ff88,#00cc6a)';
        }
    },

    // ============================================================
    // LOGS
    // ============================================================
    addLog(message, type = 'info') {
        const container = document.getElementById('adminLogs');
        if (!container) return;

        const time = new Date().toLocaleTimeString('pt-BR');
        const colors = { info: '#00bfff', success: '#00ff88', warning: '#ffaa00', error: '#ff4444' };

        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        div.innerHTML = `<span style="color:var(--muted);font-size:.7rem;">[${time}]</span> <span style="color:${colors[type] || colors.info};">${message}</span>`;
        container.prepend(div);

        if (container.children.length > 100) container.removeChild(container.lastChild);
    },

    renderLogs() {
        this.addLog('🟢 Admin v5.1 carregado', 'info');
        this.addLog('📊 ' + this.users.length + ' usuários carregados', 'info');
        this.addLog('💰 Custos IAs: R$ ' + (this.costs.total || 0).toFixed(2), 'info');
    },

    // ============================================================
    // AÇÕES DO PAINEL
    // ============================================================
    async clearCache() {
        if (!confirm('🧹 Limpar todo o cache?')) return;
        localStorage.clear();
        this.costs = { groq: 0, deepseek: 0, claude: 0, total: 0 };
        this.renderCosts();
        this.addLog('🧹 Cache limpo', 'success');
        alert('✅ Cache limpo!');
    },

    async restartEngine() {
        if (!confirm('🔄 Reiniciar?')) return;
        this.addLog('🔄 Reiniciando...', 'warning');
        window.location.reload();
    },

    async exportData() {
        const data = { users: this.users, costs: this.costs, exported_at: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'filipa_backup_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        this.addLog('📥 Dados exportados', 'success');
    },

    async toggleMaintenance() {
        const isMaint = localStorage.getItem('filipa_maintenance') === 'true';
        const newState = !isMaint;
        localStorage.setItem('filipa_maintenance', newState);
        this.addLog(newState ? '🔧 Manutenção ATIVADA' : '✅ Manutenção DESATIVADA', newState ? 'warning' : 'success');
        alert(newState ? '🔧 Manutenção ativada' : '✅ Manutenção desativada');
    },

    // ============================================================
    // HELPERS
    // ============================================================
    setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text ?? '--';
    },

    refreshUsers() {
        this.loadUsers();
        this.addLog('🔄 Lista atualizada', 'info');
    },

    startRealtime() {
        setInterval(() => { this.loadStats(); this.loadCosts(); }, 30000);
        setInterval(() => this.loadUsers(), 120000);
    }
};

// ============================================================
// INICIALIZAR — Múltiplas tentativas com delay progressivo
// ============================================================
(function initAdmin() {
    let attempts = 0;
    const maxAttempts = 30;

    function tryInit() {
        attempts++;
        console.log(`[Admin] Tentativa ${attempts}/${maxAttempts}...`);

        if (window.supabaseClient) {
            console.log('[Admin] ✅ supabaseClient encontrado, iniciando...');
            Admin.init();
            return;
        }

        if (attempts < maxAttempts) {
            setTimeout(tryInit, 500);
        } else {
            console.error('[Admin] ❌ Falha ao iniciar — supabaseClient não disponível');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(tryInit, 500);
        });
    } else {
        setTimeout(tryInit, 500);
    }
})();

window.Admin = Admin;
console.log('✅ Admin v5.1 carregado — pronto para iniciar');