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
        if (usuarioLogado.cargo === 'Administrador') {
            configSection.innerHTML = `
                <h3>Configurações do Sistema (Administrador)</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px; border: 1px solid var(--border-color);">
                    <p style="margin-bottom: 10px;"><label><input type="checkbox" checked> Permitir notificações de estoque crítico</label></p>
                    <p style="margin-bottom: 15px;"><label><input type="checkbox"> Exigir aprovação de notas fiscais</label></p>
                    <button class="btn">Salvar Diretrizes</button>
                </div>
            `;
        } else {
            configSection.innerHTML = `
                <h3>Configurações da Conta (Operador)</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px; border: 1px solid var(--border-color);">
                    <p style="margin-bottom: 15px; color: var(--texto-mutado);">Olá, <strong>${usuarioLogado.nome}</strong>. Suas permissões permitem apenas alterações cadastrais.</p>
                    <button class="btn">Alterar My Senha</button>
                </div>
            `;
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