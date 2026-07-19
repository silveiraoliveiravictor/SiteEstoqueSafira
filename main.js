document.addEventListener("DOMContentLoaded", function() {
    // Variáveis globais para armazenar as instâncias dos gráficos da Chart.js
    let meuGrafico = null; 
    let graficoSemanal = null;

    // ==========================================
    // 1. BANCO DE DADOS LOCAL (INICIALIZAÇÃO)
    // ==========================================
    if (!localStorage.getItem('produtos')) {
        const produtosIniciais = [
            { nome: 'Arroz Branco 5kg', categoria: 'Alimento', qtd: 45, minimo: 10, validade: '2026-09-30', fornecedor: 'Distribuidora ABC' },
            { nome: 'Feijão Preto 1kg', categoria: 'Alimento', qtd: 8, minimo: 15, validade: '2026-12-15', fornecedor: 'Distribuidora ABC' },
            { nome: 'Suco de Caixa 200ml', categoria: 'Bebida', qtd: 3, minimo: 20, validade: '2026-06-25', fornecedor: 'Bebidas Sul' }
        ];
        localStorage.setItem('produtos', JSON.stringify(produtosIniciais));
    }

    if (!localStorage.getItem('movimentacoes')) {
        const movimentacoesIniciais = [
            { produto: 'Arroz Branco 5kg', tipo: 'Entrada', qtd: 10, data: '11/06/2026 08:15', usuario: 'Maria S.', infoExtra: 'NF-2341' },
            { produto: 'Feijão Preto 1kg', tipo: 'Saída', qtd: 5, data: '11/06/2026 09:30', usuario: 'João P.', infoExtra: 'R$ 24,50' }
        ];
        localStorage.setItem('movimentacoes', JSON.stringify(movimentacoesIniciais));
    }

    // ==========================================
    // 2. CONTROLE DE ACESSO E PERFIL (CONFIGURAÇÕES)
    // ==========================================
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'login.html';
        return;
    }

    // Iniciais do Avatar
    const nomePartes = usuarioLogado.nome.trim().split(' ');
    const iniciais = nomePartes.length > 1 
        ? (nomePartes[0][0] + nomePartes[1][0]).toUpperCase() 
        : nomePartes[0][0].toUpperCase();

    document.querySelector('.user-avatar').textContent = iniciais;
    document.querySelector('.user-info p').textContent = usuarioLogado.nome;
    document.querySelector('.user-info span').textContent = usuarioLogado.cargo;

    const configSection = document.getElementById('config');
    if (configSection) {
        if (!localStorage.getItem('configuracoesSistema')) {
            const configPadrao = { notificacoesCriticas: true, exigirNF: false, limiteDiasVencimento: 7, temaEscuro: false };
            localStorage.setItem('configuracoesSistema', JSON.stringify(configPadrao));
        }
        const configsAtuais = JSON.parse(localStorage.getItem('configuracoesSistema'));

        if (usuarioLogado.cargo === 'Administrador') {
            configSection.innerHTML = `
                <div class="config-header">
                    <h3>Painel de Diretrizes e Segurança</h3>
                    <p class="section-subtitle">Gestão de políticas globais da cantina • Nível Administrador</p>
                </div>
                <div class="config-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="margin-bottom: 15px; color: #1e3a8a; display: flex; align-items: center; gap: 8px;">⚙️ Parâmetros do Sistema</h4>
                            <div style="margin-bottom: 12px;"><label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" id="cfg-notificacoes" ${configsAtuais.notificacoesCriticas ? 'checked' : ''}><span>Alertas de Estoque Crítico</span></label><small style="display: block; color: #64748b; margin-left: 24px;">Ativa avisos visuais vermelhos na listagem principal.</small></div>
                            <div style="margin-bottom: 12px;"><label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" id="cfg-nf" ${configsAtuais.exigirNF ? 'checked' : ''}><span>Obrigatoriedade de Nota Fiscal</span></label><small style="display: block; color: #64748b; margin-left: 24px;">Bloqueia entradas de mercadoria sem código identificador.</small></div>
                            <div style="margin-bottom: 12px;"><label style="display: block; margin-bottom: 5px; font-weight: 500;">Margem de Alerta de Vencimento (Dias):</label><input type="number" id="cfg-dias-venc" value="${configsAtuais.limiteDiasVencimento || 7}" min="1" max="90" style="width: 80px; padding: 5px; border-radius: 4px; border: 1px solid var(--border-color);"></div>
                        </div>
                        <button id="btn-salvar-diretrizes" class="btn" style="width: 100%; margin-top: 15px;">Salvar Diretrizes</button>
                    </div>
                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="margin-bottom: 15px; color: #b91c1c;">💾 Banco de Dados Local (LocalStorage)</h4>
                            <p style="font-size: 13px; color: #475569; margin-bottom: 15px;">Gerenciamento de segurança dos registros internos armazenados no navegador.</p>
                            <button id="btn-exportar-json" class="btn" style="background: #10b981; margin-bottom: 10px; width: 100%;">📥 Exportar Backup do Sistema (JSON)</button>
                            <button id="btn-limpar-historico" class="btn" style="background: #ef4444; width: 100%;">⚠️ Limpar Histórico de Movimentações</button>
                        </div>
                        <small style="color: #94a3b8; display: block; margin-top: 15px; text-align: center;">Última sincronização: Tempo Real</small>
                    </div>
                </div>
            `;

            document.getElementById('btn-salvar-diretrizes').addEventListener('click', function() {
                const novasConfigs = {
                    notificacoesCriticas: document.getElementById('cfg-notificacoes').checked,
                    exigirNF: document.getElementById('cfg-nf').checked,
                    limiteDiasVencimento: Number(document.getElementById('cfg-dias-venc').value),
                    temaEscuro: configsAtuais.temaEscuro
                };
                localStorage.setItem('configuracoesSistema', JSON.stringify(novasConfigs));
                alert('Diretrizes globais de segurança atualizadas com sucesso!');
                renderizarSistema();
            });

            document.getElementById('btn-exportar-json').addEventListener('click', function() {
                const dadosBackup = { produtos: JSON.parse(localStorage.getItem('produtos')), movimentacoes: JSON.parse(localStorage.getItem('movimentacoes')), configuracoes: JSON.parse(localStorage.getItem('configuracoesSistema')) };
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosBackup, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `backup_cantina_${new Date().toISOString().slice(0,10)}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
            });

            document.getElementById('btn-limpar-historico').addEventListener('click', function() {
                if (confirm('ATENÇÃO: Deseja apagar permanentemente TODO o histórico? O saldo atual dos produtos não mudará.')) {
                    localStorage.setItem('movimentacoes', JSON.stringify([]));
                    alert('Histórico de movimentações zerado!');
                    renderizarSistema();
                }
            });
        } else {
            configSection.innerHTML = `
                <div class="config-header"><h3>Configurações da Conta</h3><p class="section-subtitle">Gerencie suas preferências de interface</p></div>
                <div class="config-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <h4 style="margin-bottom: 15px; color: #1e3a8a;">👤 Dados Cadastrais</h4>
                        <div style="margin-bottom: 10px;"><label style="display:block; font-size:12px; font-weight:600; color:#64748b;">NOME COMPLETO</label><input type="text" value="${usuarioLogado.nome}" disabled style="width:100%; padding:8px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; color:#475569;"></div>
                        <div style="margin-bottom: 10px;"><label style="display:block; font-size:12px; font-weight:600; color:#64748b;">FUNÇÃO ATUAL</label><input type="text" value="${usuarioLogado.cargo}" disabled style="width:100%; padding:8px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; color:#475569;"></div>
                    </div>
                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="margin-bottom: 15px; color: #1e3a8a;">🔒 Credenciais de Acesso</h4>
                            <div style="margin-bottom: 10px;"><label style="display:block; font-size:13px; margin-bottom:4px;">Nova Senha:</label><input type="password" id="op-nova-senha" placeholder="••••••••" style="width:100%; padding:6px; border:1px solid var(--border-color); border-radius:4px;"></div>
                            <div style="margin-bottom: 10px;"><label style="display:block; font-size:13px; margin-bottom:4px;">Confirme a Senha:</label><input type="password" id="op-confirma-senha" placeholder="••••••••" style="width:100%; padding:6px; border:1px solid var(--border-color); border-radius:4px;"></div>
                        </div>
                        <button id="btn-atualizar-senha" class="btn" style="width:100%; margin-top:15px;">Atualizar Senha de Acesso</button>
                    </div>
                </div>
            `;
            document.getElementById('btn-atualizar-senha').addEventListener('click', function() {
                const s = document.getElementById('op-nova-senha').value;
                const c = document.getElementById('op-confirma-senha').value;
                if (!s || !c) { alert('Preencha ambos os campos.'); return; }
                if (s !== c) { alert('As senhas não coincidem.'); return; }
                alert('Senha alterada localmente com sucesso!');
                document.getElementById('op-nova-senha').value = '';
                document.getElementById('op-confirma-senha').value = '';
            });
        }
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) { e.preventDefault(); sessionStorage.removeItem('usuarioLogado'); window.location.href = 'login.html'; });
    }

    // ==========================================
    // 3. RENDERIZAÇÃO DINÂMICA (TABELAS, CARDS E GRÁFICOS)
    // ==========================================
    function formatarData(dateObj) {
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        const h = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        return `${d}/${m}/${y} ${h}:${min}`;
    }

    function renderizarSistema() {
        const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
        const movimentacoes = JSON.parse(localStorage.getItem('movimentacoes')) || [];
        const configs = JSON.parse(localStorage.getItem('configuracoesSistema')) || { limiteDiasVencimento: 7 };

        // ---- RECALCULAR CARDS DO DASHBOARD ----
        let totalItens = 0;
        let estoqueBaixoContador = 0;
        let proximosVencimentosContador = 0;
        let movimentacaoSemanalContador = 0;
        const categoriasUnicas = new Set();
        
        const hoje = new Date();
        const daquiXDias = new Date();
        daquiXDias.setDate(hoje.getDate() + (configs.limiteDiasVencimento || 7));

        produtos.forEach(p => {
            totalItens += Number(p.qtd);
            if (Number(p.qtd) < Number(p.minimo)) estoqueBaixoContador++;
            if (p.categoria) categoriasUnicas.add(p.categoria.trim());
            if (p.validade) {
                const dataValidade = new Date(p.validade + 'T00:00:00');
                if (dataValidade >= hoje && dataValidade <= daquiXDias) proximosVencimentosContador++;
            }
        });

        movimentacoes.forEach(m => {
            try {
                const partesData = m.data.split(' ')[0].split('/');
                const dataMov = new Date(partesData[2], partesData[1] - 1, partesData[0]);
                const difDias = Math.ceil((hoje - dataMov) / (1000 * 60 * 60 * 24));
                if (difDias >= 0 && difDias <= 7) movimentacaoSemanalContador += Number(m.qtd);
            } catch (err) {}
        });

        if (document.getElementById('dash-total-itens')) document.getElementById('dash-total-itens').textContent = totalItens;
        if (document.getElementById('dash-total-categorias')) document.getElementById('dash-total-categorias').textContent = `${categoriasUnicas.size} categorias`;
        if (document.getElementById('dash-estoque-baixo')) document.getElementById('dash-estoque-baixo').textContent = estoqueBaixoContador;
        if (document.getElementById('dash-prox-vencimentos')) document.getElementById('dash-prox-vencimentos').textContent = proximosVencimentosContador;
        if (document.getElementById('dash-mov-semanal')) document.getElementById('dash-mov-semanal').textContent = movimentacaoSemanalContador;

        // ---- TABELA: ESTOQUE ATUAL ----
        const tbodyEstoque = document.getElementById('tbody-estoque');
        if (tbodyEstoque) {
            tbodyEstoque.innerHTML = '';
            produtos.forEach(p => {
                let badgeClass = 'badge-ok'; let statusTexto = 'OK';
                if (Number(p.qtd) === 0) { badgeClass = 'badge-critico'; statusTexto = 'Zerado'; }
                else if (Number(p.qtd) < Number(p.minimo)) { badgeClass = 'badge-baixo'; statusTexto = 'Baixo'; }

                const dataBr = p.validade.split('-').reverse().join('/');

                tbodyEstoque.innerHTML += `
                    <tr>
                        <td><strong>${p.nome}</strong></td>
                        <td>${p.categoria}</td>
                        <td>${p.qtd}</td>
                        <td>${p.minimo}</td>
                        <td><span class="badge ${badgeClass}">${statusTexto}</span></td>
                        <td>${dataBr}</td>
                        <td>${p.fornecedor}</td>
                        <td>
                            <button class="btn-editar" data-nome="${p.nome}" style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; margin-right: 5px;">Editar</button>
                            <button class="btn-excluir" data-nome="${p.nome}" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">Excluir</button>
                        </td>
                    </tr>
                `;
            });

            // Ativa eventos dos botões excluir e editar
            tbodyEstoque.querySelectorAll('.btn-excluir').forEach(btn => {
                btn.addEventListener('click', function() { excluirProduto(this.getAttribute('data-nome')); });
            });
            tbodyEstoque.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', function() { editarProduto(this.getAttribute('data-nome')); });
            });
        }

        // ---- OUTRAS TABELAS DO HISTÓRICO ----
        const tbodyRecente = document.getElementById('tbody-recente');
        if (tbodyRecente) {
            tbodyRecente.innerHTML = '';
            movimentacoes.slice(-5).reverse().forEach(m => {
                const bc = m.tipo === 'Entrada' ? 'badge-entrada' : 'badge-saida';
                tbodyRecente.innerHTML += `<tr><td>${m.produto}</td><td><span class="badge ${bc}">${m.tipo}</span></td><td>${m.qtd}</td><td>${m.data}</td><td>${m.usuario}</td></tr>`;
            });
        }

        const tbodyEntradas = document.getElementById('tbody-entradas');
        if (tbodyEntradas) {
            tbodyEntradas.innerHTML = '';
            movimentacoes.filter(m => m.tipo === 'Entrada').reverse().forEach(m => {
                tbodyEntradas.innerHTML += `<tr><td>${m.produto}</td><td>Movimentação</td><td>${m.qtd}</td><td>${m.data.split(' ')[0]}</td><td>${m.usuario}</td><td>${m.infoExtra || '-'}</td></tr>`;
            });
        }

        const tbodySaidas = document.getElementById('tbody-saidas');
        if (tbodySaidas) {
            tbodySaidas.innerHTML = '';
            movimentacoes.filter(m => m.tipo === 'Saída').reverse().forEach(m => {
                tbodySaidas.innerHTML += `<tr><td>${m.produto}</td><td>Movimentação</td><td>${m.qtd}</td><td>${m.data.split(' ')[0]}</td><td>${m.usuario}</td><td>${m.infoExtra || '-'}</td></tr>`;
            });
        }

        // ---- GRÁFICO 1: NÍVEIS DE ESTOQUE ----
        const ctxEstoque = document.getElementById('graficoEstoque');
        if (ctxEstoque) {
            if (meuGrafico) meuGrafico.destroy();
            meuGrafico = new Chart(ctxEstoque, {
                type: 'bar',
                data: { labels: produtos.map(p => p.nome), datasets: [{ label: 'Quantidade em Estoque', data: produtos.map(p => Number(p.qtd)), backgroundColor: '#1e3a8a', borderRadius: 4 }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, scales: { x: { beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } }, plugins: { legend: { display: false } } }
            });
        }

        // ---- GRÁFICO 2: MOVIMENTAÇÃO SEMANAL ----
        const ctxSemanal = document.getElementById('graficoSemanalSaidas');
        if (ctxSemanal) {
            const somaDias = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            movimentacoes.forEach(m => {
                if (m.tipo === 'Saída') {
                    try {
                        const partes = m.data.split(' ')[0].split('/');
                        const dObj = new Date(partes[2], partes[1] - 1, partes[0]);
                        if (dObj.getDay() >= 1 && dObj.getDay() <= 5) somaDias[dObj.getDay()] += Number(m.qtd);
                    } catch (e) {}
                }
            });
            if (graficoSemanal) graficoSemanal.destroy();
            graficoSemanal = new Chart(ctxSemanal, {
                type: 'bar',
                data: { labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'], datasets: [{ label: 'Itens Retirados', data: [somaDias[1], somaDias[2], somaDias[3], somaDias[4], somaDias[5]], backgroundColor: '#ef4444', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
            });
        }
    }

    renderizarSistema();

    // ==========================================
    // 4. LÓGICA DO MODAL: ADICIONAR / EDITAR PRODUTO
    // ==========================================
    const btnAbrirModal = document.getElementById('btn-abrir-modal');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const modalProduto = document.getElementById('modal-produto');
    const formProduto = document.getElementById('form-produto');

    if (btnAbrirModal) {
        btnAbrirModal.addEventListener('click', function(e) {
            e.preventDefault();
            formProduto.reset();
            document.getElementById('edit-nome-original').value = '';
            document.querySelector('#modal-produto h3').textContent = 'Cadastrar Novo Produto';
            modalProduto.classList.add('active');
        });
    }

    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', function() {
            modalProduto.classList.remove('active');
        });
    }

    if (formProduto) {
        formProduto.addEventListener('submit', function(e) {
            e.preventDefault();

            const nome = document.getElementById('prod-nome').value;
            const categoria = document.getElementById('prod-categoria').value;
            const qtd = Number(document.getElementById('prod-qtd').value);
            const minimo = Number(document.getElementById('prod-minimo').value);
            const validade = document.getElementById('prod-validade').value;
            const fornecedor = document.getElementById('prod-fornecedor').value;

            const nomeOriginal = document.getElementById('edit-nome-original').value;
            let produtos = JSON.parse(localStorage.getItem('produtos')) || [];

            if (nomeOriginal) {
                // ---- CÓDIGO DE EDIÇÃO DE PRODUTO ----
                const index = produtos.findIndex(p => p.nome === nomeOriginal);
                if (index !== -1) {
                    produtos[index] = { nome, categoria, qtd, minimo, validade, fornecedor };
                }
                localStorage.setItem('produtos', JSON.stringify(produtos));
                alert('Produto atualizado com sucesso!');
            } else {
                // ---- CÓDIGO DE NOVO CADASTRO ----
                const produtoExiste = produtos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
                if (produtoExiste) { alert('Esse produto já está cadastrado!'); return; }

                produtos.push({ nome, categoria, qtd, minimo, validade, fornecedor });
                localStorage.setItem('produtos', JSON.stringify(produtos));

                const movimentacoes = JSON.parse(localStorage.getItem('movimentacoes')) || [];
                movimentacoes.push({
                    produto: nome, tipo: 'Entrada', qtd: qtd, data: formatarData(new Date()),
                    usuario: usuarioLogado.nome.split(' ')[0] + ' ' + (usuarioLogado.nome.split(' ')[1] || '')[0] + '.',
                    infoExtra: 'Carga Inicial'
                });
                localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));
                alert('Produto cadastrado com sucesso!');
            }

            formProduto.reset();
            document.getElementById('edit-nome-original').value = '';
            document.querySelector('#modal-produto h3').textContent = 'Cadastrar Novo Produto';
            modalProduto.classList.remove('active');
            renderizarSistema();
        });
    }

    // ---- AUXILIAR: CARREGA DADOS DO PRODUTO NO MODAL ----
    function editarProduto(nome) {
        const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
        const produto = produtos.find(p => p.nome === nome);
        
        if (produto) {
            document.querySelector('#modal-produto h3').textContent = 'Editar Produto';
            
            document.getElementById('prod-nome').value = produto.nome;
            document.getElementById('prod-categoria').value = produto.categoria;
            document.getElementById('prod-fornecedor').value = produto.fornecedor;
            document.getElementById('prod-qtd').value = produto.qtd;
            document.getElementById('prod-minimo').value = produto.minimo;
            document.getElementById('prod-validade').value = produto.validade;
            
            document.getElementById('edit-nome-original').value = produto.nome;
            modalProduto.classList.add('active'); 
        }
    }

    // ---- AUXILIAR: EXCLUI PRODUTO ----
    function excluirProduto(nome) {
        if (confirm(`Tem certeza que deseja remover o produto "${nome}" definitivamente?`)) {
            let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
            produtos = produtos.filter(p => p.nome !== nome);
            localStorage.setItem('produtos', JSON.stringify(produtos));
            renderizarSistema();
        }
    }

    // ==========================================
    // 5. LÓGICA: MODAIS DE ENTRADA E SAÍDA
    // ==========================================
    const btnAbrirEntrada = document.getElementById('btn-registrar-entrada');
    const btnFecharEntrada = document.getElementById('btn-fechar-entrada');
    const modalEntrada = document.getElementById('modal-entrada');
    const formEntrada = document.getElementById('form-entrada');
    const selectEntProduto = document.getElementById('ent-produto');

    const btnAbrirSaida = document.getElementById('btn-registrar-saida');
    const btnFecharSaida = document.getElementById('btn-fechar-saida');
    const modalSaida = document.getElementById('modal-saida');
    const formSaida = document.getElementById('form-saida');
    const selectSaiProduto = document.getElementById('sai-produto');

    function atualizarDropdownsProdutos() {
        const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
        let options = '<option value="" disabled selected>Escolha um produto...</option>';
        produtos.forEach(p => { options += `<option value="${p.nome}">${p.nome} (Atual: ${p.qtd})</option>`; });
        if (selectEntProduto) selectEntProduto.innerHTML = options;
        if (selectSaiProduto) selectSaiProduto.innerHTML = options;
    }

    if (btnAbrirEntrada) {
        btnAbrirEntrada.addEventListener('click', function(e) { e.preventDefault(); atualizarDropdownsProdutos(); modalEntrada.classList.add('active'); });
    }
    if (btnFecharEntrada) {
        btnFecharEntrada.addEventListener('click', function() { modalEntrada.classList.remove('active'); });
    }
    if (formEntrada) {
        formEntrada.addEventListener('submit', function(e) {
            e.preventDefault();
            const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
            const nomeProduto = selectEntProduto.value;
            const qtdEntrada = Number(document.getElementById('ent-qtd').value);
            const nf = document.getElementById('ent-nf').value || "NF-Direta";

            const produto = produtos.find(p => p.nome === nomeProduto);
            if (!produto) return;
            
            produto.qtd = Number(produto.qtd) + qtdEntrada;
            localStorage.setItem('produtos', JSON.stringify(produtos));

            const movimentacoes = JSON.parse(localStorage.getItem('movimentacoes')) || [];
            movimentacoes.push({ produto: produto.nome, tipo: 'Entrada', qtd: qtdEntrada, data: formatarData(new Date()), usuario: usuarioLogado.nome.split(' ')[0], infoExtra: nf });
            localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));

            formEntrada.reset();
            modalEntrada.classList.remove('active');
            renderizarSistema();
            alert('Entrada registrada com sucesso!');
        });
    }

    if (btnAbrirSaida) {
        btnAbrirSaida.addEventListener('click', function(e) { e.preventDefault(); atualizarDropdownsProdutos(); modalSaida.classList.add('active'); });
    }
    if (btnFecharSaida) {
        btnFecharSaida.addEventListener('click', function() { modalSaida.classList.remove('active'); });
    }
    if (formSaida) {
        formSaida.addEventListener('submit', function(e) {
            e.preventDefault();
            const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
            const nomeProduto = selectSaiProduto.value;
            const qtdSaida = Number(document.getElementById('sai-qtd').value);
            const infoExtra = document.getElementById('sai-info').value;

            const produto = produtos.find(p => p.nome === nomeProduto);
            if (!produto) return;

            if (qtdSaida > Number(produto.qtd)) {
                alert(`Operação cancelada! Saldo insuficiente. Você só tem ${produto.qtd} unidades de ${produto.nome}.`);
                return;
            }

            produto.qtd = Number(produto.qtd) - qtdSaida;
            localStorage.setItem('produtos', JSON.stringify(produtos));

            const movimentacoes = JSON.parse(localStorage.getItem('movimentacoes')) || [];
            movimentacoes.push({ produto: produto.nome, tipo: 'Saída', qtd: qtdSaida, data: formatarData(new Date()), usuario: usuarioLogado.nome.split(' ')[0], infoExtra: infoExtra });
            localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));

            formSaida.reset();
            modalSaida.classList.remove('active');
            renderizarSistema();
            alert('Saída registrada com sucesso!');
        });
    }

    // Fechar ao clicar fora
    window.addEventListener('click', function(e) {
        if (e.target === modalProduto) { modalProduto.classList.remove('active'); }
        if (e.target === modalEntrada) modalEntrada.classList.remove('active');
        if (e.target === modalSaida) modalSaida.classList.remove('active');
    });
});