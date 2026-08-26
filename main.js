document.addEventListener("DOMContentLoaded", async function() {
    const API_URL = 'http://localhost:3000/api';
    let meuGrafico = null; 
    let graficoSemanal = null;
    let listaProdutosGlobal = []; // Guarda a lista em memória para reuso nos selects e edições

    // ==========================================
    // 1. CONTROLE DE ACESSO E PERFIL
    // ==========================================
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'login.html';
        return;
    }

    const nomePartes = usuarioLogado.nome.trim().split(' ');
    const iniciais = nomePartes.length > 1 
        ? (nomePartes[0][0] + nomePartes[1][0]).toUpperCase() 
        : nomePartes[0][0].toUpperCase();

    document.querySelector('.user-avatar').textContent = iniciais;
    document.querySelector('.user-info p').textContent = usuarioLogado.nome;
    document.querySelector('.user-info span').textContent = usuarioLogado.cargo;

    // Configurações do Painel
    const configSection = document.getElementById('config');
    if (configSection) {
        let configsAtuais = { notificacoesCriticas: true, exigirNF: false, limiteDiasVencimento: 7 };
        try {
            const resCfg = await fetch(`${API_URL}/configuracoes`);
            configsAtuais = await resCfg.json();
        } catch (e) {}

        if (usuarioLogado.cargo === 'Administrador') {
            configSection.innerHTML = `
                <div class="config-header">
                    <h3>Painel de Diretrizes e Segurança</h3>
                    <p class="section-subtitle">Gestão de políticas globais da cantina • Nível Administrador</p>
                </div>
                <div class="config-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="margin-bottom: 15px; color: #1e3a8a;">⚙️ Parâmetros do Sistema</h4>
                            <div style="margin-bottom: 12px;"><label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" id="cfg-notificacoes" ${configsAtuais.notificacoesCriticas ? 'checked' : ''}><span>Alertas de Estoque Crítico</span></label></div>
                            <div style="margin-bottom: 12px;"><label style="display: flex; align-items: center; gap: 10px; cursor: pointer;"><input type="checkbox" id="cfg-nf" ${configsAtuais.exigirNF ? 'checked' : ''}><span>Obrigatoriedade de Nota Fiscal</span></label></div>
                            <div style="margin-bottom: 12px;"><label style="display: block; margin-bottom: 5px; font-weight: 500;">Margem de Alerta de Vencimento (Dias):</label><input type="number" id="cfg-dias-venc" value="${configsAtuais.limiteDiasVencimento || 7}" min="1" max="90" style="width: 80px; padding: 5px;"></div>
                        </div>
                        <button id="btn-salvar-diretrizes" class="btn" style="width: 100%; margin-top: 15px;">Salvar no Banco de Dados</button>
                    </div>
                </div>
            `;

            document.getElementById('btn-salvar-diretrizes').addEventListener('click', async function() {
                const novasConfigs = {
                    notificacoesCriticas: document.getElementById('cfg-notificacoes').checked,
                    exigirNF: document.getElementById('cfg-nf').checked,
                    limiteDiasVencimento: Number(document.getElementById('cfg-dias-venc').value)
                };
                await fetch(`${API_URL}/configuracoes`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(novasConfigs)
                });
                alert('Diretrizes salvas no Banco de Dados!');
                renderizarSistema();
            });
        } else {
            configSection.innerHTML = `
                <div class="config-header"><h3>Configurações da Conta</h3><p class="section-subtitle">Gerencie suas credenciais</p></div>
                <div class="config-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <h4 style="margin-bottom: 15px; color: #1e3a8a;">🔒 Alterar Senha no Banco</h4>
                        <div style="margin-bottom: 10px;"><label style="display:block; font-size:13px;">Nova Senha:</label><input type="password" id="op-nova-senha" placeholder="••••••••" style="width:100%; padding:6px;"></div>
                        <div style="margin-bottom: 10px;"><label style="display:block; font-size:13px;">Confirme a Senha:</label><input type="password" id="op-confirma-senha" placeholder="••••••••" style="width:100%; padding:6px;"></div>
                        <button id="btn-atualizar-senha" class="btn" style="width:100%; margin-top:15px;">Atualizar Senha</button>
                    </div>
                </div>
            `;

            document.getElementById('btn-atualizar-senha').addEventListener('click', async function() {
                const s = document.getElementById('op-nova-senha').value;
                const c = document.getElementById('op-confirma-senha').value;
                if (!s || s !== c) { alert('As senhas não coincidem ou estão vazias.'); return; }

                const res = await fetch(`${API_URL}/usuarios/${usuarioLogado.id_usuario}/senha`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ novaSenha: s })
                });
                if (res.ok) {
                    alert('Senha alterada no Banco de Dados!');
                    document.getElementById('op-nova-senha').value = '';
                    document.getElementById('op-confirma-senha').value = '';
                }
            });
        }
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sessionStorage.removeItem('usuarioLogado');
            window.location.href = 'login.html';
        });
    }

    // ==========================================
    // 2. BUSCA DE DADOS E RENDERIZAÇÃO
    // ==========================================
    async function renderizarSistema() {
        try {
            const [resProd, resMov, resCfg] = await Promise.all([
                fetch(`${API_URL}/produtos`),
                fetch(`${API_URL}/movimentacoes`),
                fetch(`${API_URL}/configuracoes`)
            ]);

            const produtos = await resProd.json();
            const movimentacoes = await resMov.json();
            const configs = await resCfg.json();

            listaProdutosGlobal = produtos; // Atualiza lista global

            // ---- RECALCULAR CARDS ----
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
                movimentacaoSemanalContador += Number(m.qtd);
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
                    const isEstoqueBaixo = Number(p.qtd) < Number(p.minimo);

                    if (Number(p.qtd) === 0) { badgeClass = 'badge-critico'; statusTexto = 'Zerado'; }
                    else if (isEstoqueBaixo) { badgeClass = 'badge-baixo'; statusTexto = 'Baixo'; }

                    const estiloLinhaCritica = (configs.notificacoesCriticas && isEstoqueBaixo) ? 'style="background-color: #fee2e2;"' : '';
                    const dataBr = p.validade ? p.validade.split('-').reverse().join('/') : '-';

                    tbodyEstoque.innerHTML += `
                        <tr ${estiloLinhaCritica}>
                            <td><strong>${p.nome}</strong></td>
                            <td>${p.categoria || 'Geral'}</td>
                            <td>${p.qtd}</td>
                            <td>${p.minimo}</td>
                            <td><span class="badge ${badgeClass}">${statusTexto}</span></td>
                            <td>${dataBr}</td>
                            <td>${p.fornecedor || '-'}</td>
                            <td>
                                <button class="btn-editar" data-id="${p.id_produto}" style="background: #3b82f6; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-right: 5px;">Editar</button>
                                <button class="btn-excluir" data-id="${p.id_produto}" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Excluir</button>
                            </td>
                        </tr>
                    `;
                });

                tbodyEstoque.querySelectorAll('.btn-excluir').forEach(btn => {
                    btn.addEventListener('click', function() { excluirProduto(this.getAttribute('data-id')); });
                });
                tbodyEstoque.querySelectorAll('.btn-editar').forEach(btn => {
                    btn.addEventListener('click', function() { editarProduto(this.getAttribute('data-id')); });
                });
            }

            // ---- TABELAS DO HISTÓRICO ----
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
                    tbodyEntradas.innerHTML += `<tr><td>${m.produto}</td><td>Movimentação</td><td>${m.qtd}</td><td>${m.data}</td><td>${m.usuario}</td><td>${m.infoextra || '-'}</td></tr>`;
                });
            }

            const tbodySaidas = document.getElementById('tbody-saidas');
            if (tbodySaidas) {
                tbodySaidas.innerHTML = '';
                movimentacoes.filter(m => m.tipo === 'Saída').reverse().forEach(m => {
                    tbodySaidas.innerHTML += `<tr><td>${m.produto}</td><td>Movimentação</td><td>${m.qtd}</td><td>${m.data}</td><td>${m.usuario}</td><td>${m.infoextra || '-'}</td></tr>`;
                });
            }

            // ---- GRÁFICOS ----
            const ctxEstoque = document.getElementById('graficoEstoque');
            if (ctxEstoque) {
                if (meuGrafico) meuGrafico.destroy();
                meuGrafico = new Chart(ctxEstoque, {
                    type: 'bar',
                    data: { labels: produtos.map(p => p.nome), datasets: [{ label: 'Qtd Estoque', data: produtos.map(p => Number(p.qtd)), backgroundColor: '#1e3a8a' }] },
                    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false }
                });
            }
        } catch (err) {
            console.error('Erro ao carregar dados do backend:', err);
        }
    }

    await renderizarSistema();

    // ==========================================
    // 3. MODAL ADICIONAR / EDITAR PRODUTO
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
        btnFecharModal.addEventListener('click', function() { modalProduto.classList.remove('active'); });
    }

    if (formProduto) {
        formProduto.addEventListener('submit', async function(e) {
            e.preventDefault();

            const payload = {
                nome: document.getElementById('prod-nome').value,
                categoria: document.getElementById('prod-categoria').value,
                qtd: Number(document.getElementById('prod-qtd').value),
                minimo: Number(document.getElementById('prod-minimo').value),
                validade: document.getElementById('prod-validade').value,
                fornecedor: document.getElementById('prod-fornecedor').value,
                id_usuario: usuarioLogado.id_usuario
            };

            const idProdutoEditando = document.getElementById('edit-nome-original').value;

            if (idProdutoEditando) {
                // EDIÇÃO
                await fetch(`${API_URL}/produtos/${idProdutoEditando}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                alert('Produto atualizado no Banco de Dados!');
            } else {
                // CADASTRO NOVO
                await fetch(`${API_URL}/produtos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                alert('Produto cadastrado no Banco de Dados!');
            }

            formProduto.reset();
            modalProduto.classList.remove('active');
            renderizarSistema();
        });
    }

    function editarProduto(id) {
        const produto = listaProdutosGlobal.find(p => String(p.id_produto) === String(id));
        if (produto) {
            document.querySelector('#modal-produto h3').textContent = 'Editar Produto';
            document.getElementById('prod-nome').value = produto.nome;
            document.getElementById('prod-categoria').value = produto.categoria;
            document.getElementById('prod-fornecedor').value = produto.fornecedor || '';
            document.getElementById('prod-qtd').value = produto.qtd;
            document.getElementById('prod-minimo').value = produto.minimo;
            document.getElementById('prod-validade').value = produto.validade || '';

            document.getElementById('edit-nome-original').value = produto.id_produto;
            modalProduto.classList.add('active'); 
        }
    }

    async function excluirProduto(id) {
        if (confirm('Deseja remover este produto do banco de dados?')) {
            await fetch(`${API_URL}/produtos/${id}`, { method: 'DELETE' });
            renderizarSistema();
        }
    }

    // ==========================================
    // 4. MODAIS DE ENTRADA E SAÍDA
    // ==========================================
    const modalEntrada = document.getElementById('modal-entrada');
    const modalSaida = document.getElementById('modal-saida');

    function atualizarDropdownsProdutos() {
        let options = '<option value="" disabled selected>Escolha um produto...</option>';
        listaProdutosGlobal.forEach(p => {
            options += `<option value="${p.id_produto}">${p.nome} (Atual: ${p.qtd})</option>`;
        });
        if (document.getElementById('ent-produto')) document.getElementById('ent-produto').innerHTML = options;
        if (document.getElementById('sai-produto')) document.getElementById('sai-produto').innerHTML = options;
    }

    document.getElementById('btn-registrar-entrada')?.addEventListener('click', (e) => {
        e.preventDefault(); atualizarDropdownsProdutos(); modalEntrada.classList.add('active');
    });
    document.getElementById('btn-fechar-entrada')?.addEventListener('click', () => modalEntrada.classList.remove('active'));

    document.getElementById('form-entrada')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id_produto = document.getElementById('ent-produto').value;
        const quantidade = Number(document.getElementById('ent-qtd').value);
        const nota_fiscal = document.getElementById('ent-nf').value;

        const res = await fetch(`${API_URL}/movimentacoes/entrada`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_produto, quantidade, nota_fiscal, id_usuario: usuarioLogado.id_usuario })
        });

        if (res.ok) {
            alert('Entrada registrada no Banco de Dados!');
            document.getElementById('form-entrada').reset();
            modalEntrada.classList.remove('active');
            renderizarSistema();
        }
    });

    document.getElementById('btn-registrar-saida')?.addEventListener('click', (e) => {
        e.preventDefault(); atualizarDropdownsProdutos(); modalSaida.classList.add('active');
    });
    document.getElementById('btn-fechar-saida')?.addEventListener('click', () => modalSaida.classList.remove('active'));

    document.getElementById('form-saida')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id_produto = document.getElementById('sai-produto').value;
        const quantidade = Number(document.getElementById('sai-qtd').value);
        const justificativa_valor = document.getElementById('sai-info').value;

        const res = await fetch(`${API_URL}/movimentacoes/saida`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_produto, quantidade, justificativa_valor, id_usuario: usuarioLogado.id_usuario })
        });

        const dados = await res.json();
        if (res.ok) {
            alert('Saída registrada no Banco de Dados!');
            document.getElementById('form-saida').reset();
            modalSaida.classList.remove('active');
            renderizarSistema();
        } else {
            alert(dados.mensagem || 'Erro ao registrar saída.');
        }
    });
});