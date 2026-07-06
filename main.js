 document.addEventListener("DOMContentLoaded", function() {
        // Recupere o usuário logado nesta sessão
        const usuarioLogado = JSON.parse(sessionStorage.getItem('usuarioLogado'));

        // 1. BARREIRA DE SEGURANÇA
        // Se não houver usuário na sessão, manda de volta para a tela de login
        if (!usuarioLogado) {
            window.location.href = 'login.html';
            return;
        }

        // 2. ATUALIZAÇÃO DINÂMICA DO PERFIL (Nome, Cargo e Iniciais)
        // Pega as duas primeiras letras do nome para o avatar (Ex: "Ana Silva" -> "AN")
        const nomePartes = usuarioLogado.nome.trim().split(' ');
        const iniciais = nomePartes.length > 1 
            ? (nomePartes[0][0] + nomePartes[1][0]).toUpperCase() 
            : nomePartes[0][0].toUpperCase();

        document.querySelector('.user-avatar').textContent = iniciais;
        document.querySelector('.user-info p').textContent = usuarioLogado.nome;
        document.querySelector('.user-info span').textContent = usuarioLogado.cargo;

        // 3. CONFIGURAÇÕES PERSONALIZADAS POR CARGO
        const configSection = document.getElementById('config');
        if (usuarioLogado.cargo === 'Administrador') {
            configSection.innerHTML = `
                <h3>Configurações do Sistema (Administrador)</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px; border: 1px solid var(--border-color);">
                    <p style="margin-bottom: 10px;"><label><input type="checkbox" checked> Permitir notificações de estoque crítico</label></p>
                    <p style="margin-bottom: 15px;"><label><input type="checkbox"> Exigir aprovação de notas fiscais nas Entradas</label></p>
                    <button class="btn">Salvar Diretrizes</button>
                </div>
            `;
        } else {
            configSection.innerHTML = `
                <h3>Configurações da Conta (Operador)</h3>
                <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 15px; border: 1px solid var(--border-color);">
                    <p style="margin-bottom: 15px; color: var(--texto-mutado);">Olá, <strong>${usuarioLogado.nome}</strong>. Suas permissões como Operador permitem apenas alterações cadastrais da sua própria conta.</p>
                    <button class="btn">Alterar Minha Senha</button>
                </div>
            `;
        }

        // 4. LÓGICA DO BOTÃO SAIR
        document.getElementById('logout-btn').addEventListener('click', function(event) {
            event.preventDefault();
            // Limpa a sessão atual (o usuário "esquece" que logou)
            sessionStorage.removeItem('usuarioLogado');
            // Redireciona para a tela de login
            window.location.href = 'login.html';
        });
    });

    // --- LÓGICA DO MODAL DE ADICIONAR PRODUTO ---
    const btnAbrirModal = document.getElementById('btn-abrir-modal');
    const btnFecharModal = document.getElementById('btn-fechar-modal');
    const modalProduto = document.getElementById('modal-produto');
    const formProduto = document.getElementById('form-produto');

    // Abre o modal ao clicar no botão
    if (btnAbrirModal) {
        btnAbrirModal.addEventListener('click', function(event) {
            event.preventDefault(); // Evita que a página role para o topo
            modalProduto.classList.add('active');
        });
    }

    // Fecha o modal ao clicar no 'X'
    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', function() {
            modalProduto.classList.remove('active');
        });
    }

    // Fecha o modal se o usuário clicar no fundo escuro fora do card
    modalProduto.addEventListener('click', function(event) {
        if (event.target === modalProduto) {
            modalProduto.classList.remove('active');
        }
    });

    // Simulação do envio do formulário por enquanto
    if (formProduto) {
        formProduto.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Só um aviso para sabermos que funcionou, antes de salvar no localStorage 
            alert('Produto capturado com sucesso! Pronto para salvar no estoque.');
            
            formProduto.reset(); // Limpa os campos
            modalProduto.classList.remove('active'); // Fecha a janela
        });
    }