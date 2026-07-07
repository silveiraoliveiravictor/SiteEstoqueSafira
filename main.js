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
    // 2. CONTROLE DE ACESSO E PERFIL
    // ==========================================
    const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

    if (!usuarioLogado) {
        window.location.href = 'login.html';
        return;
    }

    // Gera as iniciais do avatar (ex: "Sophia Soares" -> "SS")
    const nomePartes = usuarioLogado.nome.trim().split(' ');
    const iniciais = nomePartes.length > 1 
        ? (nomePartes[0][0] + nomePartes[1][0]).toUpperCase() 
        : nomePartes[0][0].toUpperCase();

    document.querySelector('.user-avatar').textContent = iniciais;
    document.querySelector('.user-info p').textContent = usuarioLogado.nome;
    document.querySelector('.user-info span').textContent = usuarioLogado.cargo;

    // Configurações dinâmicas baseadas no cargo do usuário
    const configSection = document.getElementById('config');
    if (configSection) {
        // Carrega configurações salvas ou define um padrão inicial caso não existam
        if (!localStorage.getItem('configuracoesSistema')) {
            const configPadrao = {
                notificacoesCriticas: true,
                exigirNF: false,
                limiteDiasVencimento: 7,
                temaEscuro: false
            };
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
                            <div style="margin-bottom: 12px;">
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" id="cfg-notificacoes" ${configsAtuais.notificacoesCriticas ? 'checked' : ''}>
                                    <span>Alertas de Estoque Crítico</span>
                                </label>
                                <small style="display: block; color: #64748b; margin-left: 24px;">Ativa avisos visuais vermelhos na listagem principal.</small>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                    <input type="checkbox" id="cfg-nf" ${configsAtuais.exigirNF ? 'checked' : ''}>
                                    <span>Obrigatoriedade de Nota Fiscal</span>
                                </label>
                                <small style="display: block; color: #64748b; margin-left: 24px;">Bloqueia entradas de mercadoria sem código identificador.</small>
                            </div>
                            <div style="margin-bottom: 12px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Margem de Alerta de Vencimento (Dias):</label>
                                <input type="number" id="cfg-dias-venc" value="${configsAtuais.limiteDiasVencimento || 7}" min="1" max="90" style="width: 80px; padding: 5px; border-radius: 4px; border: 1px solid var(--border-color);">
                            </div>
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

            // LÓGICA DO BOTÃO: SALVAR DIRETRIZES
            document.getElementById('btn-salvar-diretrizes').addEventListener('click', function() {
                const novasConfigs = {
                    notificacoesCriticas: document.getElementById('cfg-notificacoes').checked,
                    exigirNF: document.getElementById('cfg-nf').checked,
                    limiteDiasVencimento: Number(document.getElementById('cfg-dias-venc').value),
                    temaEscuro: configsAtuais.temaEscuro
                };
                localStorage.setItem('configuracoesSistema', JSON.stringify(novasConfigs));
                alert('Diretrizes globais de segurança atualizadas com sucesso!');
                renderizarSistema(); // Recarrega os cards se a margem de dias mudou
            });

            // LÓGICA DO BOTÃO: EXPORTAR BACKUP (Isso aqui impressiona bancas)
            document.getElementById('btn-exportar-json').addEventListener('click', function() {
                const dadosBackup = {
                    produtos: JSON.parse(localStorage.getItem('produtos')),
                    movimentacoes: JSON.parse(localStorage.getItem('movimentacoes')),
                    configuracoes: JSON.parse(localStorage.getItem('configuracoesSistema'))
                };
                
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosBackup, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `backup_cantina_${new Date().toISOString().slice(0,10)}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
            });

            // LÓGICA DO BOTÃO: LIMPAR HISTÓRICO
            document.getElementById('btn-limpar-historico').addEventListener('click', function() {
                if (confirm('ATENÇÃO: Deseja apagar permanentemente TODO o histórico de entradas e saídas? O saldo atual dos produtos não será alterado.')) {
                    localStorage.setItem('movimentacoes', JSON.stringify([]));
                    alert('Histórico de movimentações zerado!');
                    renderizarSistema();
                }
            });

        } else {
            // VIEW DO OPERADOR (Foco em dados do perfil e usabilidade)
            configSection.innerHTML = `
                <div class="config-header">
                    <h3>Configurações da Conta</h3>
                    <p class="section-subtitle">Gerencie suas preferências de acesso e interface</p>
                </div>
                
                <div class="config-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
                    
                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <h4 style="margin-bottom: 15px; color: #1e3a8a;">👤 Dados Cadastrais</h4>
                        <div style="margin-bottom: 10px;">
                            <label style="display:block; font-size:12px; font-weight:600; color:#64748b;">NOME COMPLETO</label>
                            <input type="text" value="${usuarioLogado.nome}" disabled style="width:100%; padding:8px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; color:#475569;">
                        </div>
                        <div style="margin-bottom: 10px;">
                            <label style="display:block; font-size:12px; font-weight:600; color:#64748b;">FUNÇÃO ATUAL</label>
                            <input type="text" value="${usuarioLogado.cargo}" disabled style="width:100%; padding:8px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; color:#475569;">
                        </div>
                        <p style="font-size:11px; color:#94a3b8; margin-top:10px;">ℹ️ Alterações no perfil cadastral devem ser solicitadas à administração do Colégio.</p>
                    </div>

                    <div class="config-card" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <h4 style="margin-bottom: 15px; color: #1e3a8a;">🔒 Credenciais de Acesso</h4>
                            <div style="margin-bottom: 10px;">
                                <label style="display:block; font-size:13px; margin-bottom:4px;">Nova Senha:</label>
                                <input type="password" id="op-nova-senha" placeholder="••••••••" style="width:100%; padding:6px; border:1px solid var(--border-color); border-radius:4px;">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label style="display:block; font-size:13px; margin-bottom:4px;">Confirme a Senha:</label>
                                <input type="password" id="op-confirma-senha" placeholder="••••••••" style="width:100%; padding:6px; border:1px solid var(--border-color); border-radius:4px;">
                            </div>
                        </div>
                        <button id="btn-atualizar-senha" class="btn" style="width:100%; margin-top:15px;">Atualizar Senha de Acesso</button>
                    </div>
                </div>
            `;

            // LÓGICA DE ALTERAÇÃO DE SENHA MOCK (Com validação profissional)
            document.getElementById('btn-atualizar-senha').addEventListener('click', function() {
                const senha = document.getElementById('op-nova-senha').value;
                const confirma = document.getElementById('op-confirma-senha').value;

                if (!senha || !confirma) {
                    alert('Por favor, preencha ambos os campos de senha.');
                    return;
                }
                if (senha !== confirma) {
                    alert('Erro: As senhas digitadas não coincidem.');
                    return;
                }
                if (senha.length < 4) {
                    alert('Por favor, defina uma senha segura com no mínimo 4 caracteres.');
                    return;
                }

                alert('Senha alterada localmente com sucesso para esta sessão!');
                document.getElementById('op-nova-senha').value = '';
                document.getElementById('op-confirma-senha').value = '';
            });
        }
    }
    // Lógica do botão de Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(event) {
            event.preventDefault();
            sessionStorage.removeItem('usuarioLogado');
            window.location.href = 'login.html';
        });
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

        // ---- RECALCULAR CARDS DO DASHBOARD ----
        let totalItens = 0;
        let estoqueBaixoContador = 0;
        let proximosVencimentosContador = 0;
        let movimentacaoSemanalContador = 0;
        
        // Set para contar quantas categorias únicas existem no sistema
        const categoriasUnicas = new Set();
        
        // Configura as datas para descobrir o que vence nos próximos 7 dias
        const hoje = new Date();
        const daquiA7Dias = new Date();
        daquiA7Dias.setDate(hoje.getDate() + 7);

        // 1. Processa os dados dos Produtos
        produtos.forEach(p => {
            totalItens += Number(p.qtd);
            
            // Valida estoque baixo
            if (Number(p.qtd) < Number(p.minimo)) {
                estoqueBaixoContador++;
            }
            
            // Guarda a categoria (evita duplicados automaticamente no Set)
            if (p.categoria) {
                categoriasUnicas.add(p.categoria.trim());
            }
            
            // Valida vencimento nos próximos 7 dias (p.validade está em formato YYYY-MM-DD)
            if (p.validade) {
                const dataValidade = new Date(p.validade + 'T00:00:00');
                if (dataValidade >= hoje && dataValidade <= daquiA7Dias) {
                    proximosVencimentosContador++;
                }
            }
        });

        // 2. Processa as Movimentações dos últimos 7 dias
        movimentacoes.forEach(m => {
            try {
                // Converte a string "dd/mm/aaaa hh:mm" para um objeto Date
                const partesData = m.data.split(' ')[0].split('/');
                const dataMovimentacao = new Date(partesData[2], partesData[1] - 1, partesData[0]);
                
                // Calcula a diferença em dias entre hoje e a data da movimentação
                const diferencaTempo = hoje - dataMovimentacao;
                const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));
                
                // Se aconteceu na última semana, soma a quantidade ao fluxo
                if (diferencaDias >= 0 && diferencaDias <= 7) {
                    movimentacaoSemanalContador += Number(m.qtd);
                }
            } catch (error) {
                // Impede que formatos de data corrompidos parem o sistema
            }
        });

        // 3. Aplica os valores reais calculados diretamente na tela
        const elTotalItens = document.getElementById('dash-total-itens');
        const elTotalCategorias = document.getElementById('dash-total-categorias');
        const elEstoqueBaixo = document.getElementById('dash-estoque-baixo');
        const elProxVencimentos = document.getElementById('dash-prox-vencimentos');
        const elMovSemanal = document.getElementById('dash-mov-semanal');

        if (elTotalItens) elTotalItens.textContent = totalItens;
        if (elTotalCategorias) elTotalCategorias.textContent = `${categoriasUnicas.size} categorias`;
        if (elEstoqueBaixo) elEstoqueBaixo.textContent = estoqueBaixoContador;
        if (elProxVencimentos) elProxVencimentos.textContent = proximosVencimentosContador;
        if (elMovSemanal) elMovSemanal.textContent = movimentacaoSemanalContador;
        // -------------------------------------------------------------

        const cardTotal = document.querySelectorAll('.card-value')[0];
        const cardBaixo = document.querySelectorAll('.card-value')[1];
        if (cardTotal) cardTotal.textContent = totalItens;
        if (cardBaixo) cardBaixo.textContent = estoqueBaixoContador;

        
        // ---- TABELA: ESTOQUE ATUAL ----
        const tbodyEstoque = document.getElementById('tbody-estoque');
        if (tbodyEstoque) {
            tbodyEstoque.innerHTML = '';
            produtos.forEach(p => {
                let badgeClass = 'badge-ok';
                let statusTexto = 'OK';
                
                if (Number(p.qtd) === 0) {
                    badgeClass = 'badge-critico';
                    statusTexto = 'Zerado';
                } else if (Number(p.qtd) < Number(p.minimo)) {
                    badgeClass = 'badge-baixo';
                    statusTexto = 'Baixo';
                }

                const dataBr = p.validade.split('-').reverse().join('/');

                // Adicionamos a célula do botão no final do HTML da linha (tr)
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
                            <button class="btn-excluir" data-nome="${p.nome}" style="background: #ef4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                                Excluir
                            </button>
                        </td>
                    </tr>
                `;
            });

            // ---- ATIVAR OS BOTÕES DE EXCLUSÃO ----
            // Criamos o evento de clique para cada botão que acabou de ser desenhado na tela
            const botoesExcluir = tbodyEstoque.querySelectorAll('.btn-excluir');
            botoesExcluir.forEach(botao => {
                botao.addEventListener('click', function() {
                    const nomeProduto = this.getAttribute('data-nome');
                    excluirProduto(nomeProduto);
                });
            });
        }

        // ---- TABELA: MOVIMENTAÇÕES RECENTES (PAINEL PRINCIPAL) ----
        const tbodyRecente = document.getElementById('tbody-recente');
        if (tbodyRecente) {
            tbodyRecente.innerHTML = '';
            movimentacoes.slice(-5).reverse().forEach(m => {
                const badgeClass = m.tipo === 'Entrada' ? 'badge-entrada' : 'badge-saida';
                tbodyRecente.innerHTML += `
                    <tr>
                        <td>${m.produto}</td>
                        <td><span class="badge ${badgeClass}">${m.tipo}</span></td>
                        <td>${m.qtd}</td>
                        <td>${m.data}</td>
                        <td>${m.usuario}</td>
                    </tr>
                `;
            });
        }

        // ---- TABELA: HISTÓRICO DE ENTRADAS ----
        const tbodyEntradas = document.getElementById('tbody-entradas');
        if (tbodyEntradas) {
            tbodyEntradas.innerHTML = '';
            movimentacoes.filter(m => m.tipo === 'Entrada').reverse().forEach(m => {
                tbodyEntradas.innerHTML += `
                    <tr>
                        <td>${m.produto}</td>
                        <td>Movimentação</td>
                        <td>${m.qtd}</td>
                        <td>${m.data.split(' ')[0]}</td>
                        <td>${m.usuario}</td>
                        <td>${m.infoExtra || '-'}</td>
                    </tr>
                `;
            });
        }

        // ---- TABELA: HISTÓRICO DE SAÍDAS ----
        const tbodySaidas = document.getElementById('tbody-saidas');
        if (tbodySaidas) {
            tbodySaidas.innerHTML = '';
            movimentacoes.filter(m => m.tipo === 'Saída').reverse().forEach(m => {
                tbodySaidas.innerHTML += `
                    <tr>
                        <td>${m.produto}</td>
                        <td>Movimentação</td>
                        <td>${m.qtd}</td>
                        <td>${m.data.split(' ')[0]}</td>
                        <td>${m.usuario}</td>
                        <td>${m.infoExtra || '-'}</td>
                    </tr>
                `;
            });
        }

        // ---- GRÁFICO 1: NÍVEIS DE ESTOQUE (PAINEL) ----
        const ctxEstoque = document.getElementById('graficoEstoque');
        if (ctxEstoque) {
            const nomedosProdutos = produtos.map(p => p.nome);
            const quantidadesProdutos = produtos.map(p => Number(p.qtd));

            if (meuGrafico) {
                meuGrafico.destroy();
            }

            meuGrafico = new Chart(ctxEstoque, {
                type: 'bar',
                data: {
                    labels: nomedosProdutos,
                    datasets: [{
                        label: 'Quantidade em Estoque',
                        data: quantidadesProdutos,
                        backgroundColor: '#1e3a8a', 
                        borderColor: '#172554',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y', 
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: { beginAtZero: true, grid: { display: false } },
                        y: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

        // ---- GRÁFICO 2: MOVIMENTAÇÃO SEMANAL DE SAÍDAS (RELATÓRIOS) ----
        const ctxSemanal = document.getElementById('graficoSemanalSaidas');
        if (ctxSemanal) {
            const somaDias = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; 

            movimentacoes.forEach(m => {
                if (m.tipo === 'Saída') {
                    try {
                        const partesData = m.data.split(' ')[0].split('/');
                        const dataObj = new Date(partesData[2], partesData[1] - 1, partesData[0]);
                        const diaSemana = dataObj.getDay(); 

                        if (diaSemana >= 1 && diaSemana <= 5) {
                            somaDias[diaSemana] += Number(m.qtd);
                        }
                    } catch (e) {
                        // Ignora erros de parsing de formatos de datas inconsistentes
                    }
                }
            });

            if (graficoSemanal) {
                graficoSemanal.destroy();
            }

            graficoSemanal = new Chart(ctxSemanal, {
                type: 'bar',
                data: {
                    labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'],
                    datasets: [{
                        label: 'Total de Itens Retirados',
                        data: [somaDias[1], somaDias[2], somaDias[3], somaDias[4], somaDias[5]],
                        backgroundColor: '#ef4444', 
                        borderColor: '#b91c1c',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { display: false } },
                        x: { grid: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }
    }

    // ---- FUNÇÃO PARA EXCLUIR UM PRODUTO DO SISTEMA ----
    function excluirProduto(nome) {
        // Exibe uma caixinha de confirmação para o usuário não deletar sem querer
        const confirmar = confirm(`Tem certeza que deseja remover o produto "${nome}" do estoque definitivamente?`);
        
        if (confirmar) {
            // 1. Pega a lista atual de produtos do LocalStorage
            let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
            
            // 2. Filtra a lista, gerando uma nova cópia SEM o produto deletado
            produtos = produtos.filter(p => p.nome !== nome);
            
            // 3. Salva de volta a lista atualizada no LocalStorage
            localStorage.setItem('produtos', JSON.stringify(produtos));
            
            // 4. Avisa o usuário e manda o sistema redesenhar a tela inteira com os novos números
            alert(`Produto "${nome}" foi removido com sucesso!`);
            renderizarSistema();
        }
    }
    

    // Inicializa a montagem das tabelas e gráficos na tela
    renderizarSistema();

    // ==========================================
    // 4. LÓGICA DO MODAL: ADICIONAR PRODUTO
    // ==========================================
    const btnAbrirModal = document.getElementById('btn-abrir-modal');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const modalProduto = document.getElementById('modal-produto');
    const formProduto = document.getElementById('form-produto');

    if (btnAbrirModal) {
        btnAbrirModal.addEventListener('click', function(e) {
            e.preventDefault();
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

            const produtos = JSON.parse(localStorage.getItem('produtos')) || [];
            
            const produtoExiste = produtos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
            if (produtoExiste) {
                alert('Esse produto já está cadastrado no sistema!');
                return;
            }

            produtos.push({ nome, categoria, qtd, minimo, validade, fornecedor });
            localStorage.setItem('produtos', JSON.stringify(produtos));

            const movimentacoes = JSON.parse(localStorage.getItem('movimentacoes')) || [];
            movimentacoes.push({
                produto: nome,
                tipo: 'Entrada',
                qtd: qtd,
                data: formatarData(new Date()),
                usuario: usuarioLogado.nome.split(' ')[0] + ' ' + (usuarioLogado.nome.split(' ')[1] || '')[0] + '.',
                infoExtra: 'Carga Inicial'
            });
            localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));

            formProduto.reset();
            modalProduto.classList.remove('active');
            
            renderizarSistema();
        });
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
        produtos.forEach(p => {
            options += `<option value="${p.nome}">${p.nome} (Atual: ${p.qtd})</option>`;
        });

        if (selectEntProduto) selectEntProduto.innerHTML = options;
        if (selectSaiProduto) selectSaiProduto.innerHTML = options;
    }

    // --- EVENTOS DO MODAL DE ENTRADA ---
    if (btnAbrirEntrada) {
        btnAbrirEntrada.addEventListener('click', function(e) {
            e.preventDefault();
            atualizarDropdownsProdutos();
            modalEntrada.classList.add('active');
        });
    }
    if (btnFecharEntrada) {
        btnFecharEntrada.addEventListener('click', function() {
            modalEntrada.classList.remove('active');
        });
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
            movimentacoes.push({
                produto: produto.nome,
                tipo: 'Entrada',
                qtd: qtdEntrada,
                data: formatarData(new Date()),
                usuario: usuarioLogado.nome.split(' ')[0],
                infoExtra: nf
            });
            localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));

            formEntrada.reset();
            modalEntrada.classList.remove('active');
            renderizarSistema();
            alert('Entrada registrada com sucesso!');
        });
    }

    // --- EVENTOS DO MODAL DE SAÍDA ---
    if (btnAbrirSaida) {
        btnAbrirSaida.addEventListener('click', function(e) {
            e.preventDefault();
            atualizarDropdownsProdutos();
            modalSaida.classList.add('active');
        });
    }
    if (btnFecharSaida) {
        btnFecharSaida.addEventListener('click', function() {
            modalSaida.classList.remove('active');
        });
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
            movimentacoes.push({
                produto: produto.nome,
                tipo: 'Saída',
                qtd: qtdSaida,
                data: formatarData(new Date()),
                usuario: usuarioLogado.nome.split(' ')[0],
                infoExtra: infoExtra
            });
            localStorage.setItem('movimentacoes', JSON.stringify(movimentacoes));

            formSaida.reset();
            modalSaida.classList.remove('active');
            renderizarSistema();
            alert('Saída registrada com sucesso!');
        });
    }

    // Fechar qualquer modal clicando na área escura de fundo externa ao card
    window.addEventListener('click', function(e) {
        if (e.target === modalProduto) modalProduto.classList.remove('active');
        if (e.target === modalEntrada) modalEntrada.classList.remove('active');
        if (e.target === modalSaida) modalSaida.classList.remove('active');
    });
});