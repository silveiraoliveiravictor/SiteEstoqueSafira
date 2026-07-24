-- ==========================================
-- LIMPEZA DO BANCO DE DADOS
-- (Remove as tabelas antigas e erradas se existirem)
-- ==========================================
DROP TABLE IF EXISTS movimentacoes_estoque CASCADE;
DROP TABLE IF EXISTS itens_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS fornecedores CASCADE;

DROP TABLE IF EXISTS movimentacoes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS configuracoes CASCADE;


-- ==========================================
-- 1. TABELA DE USUÁRIOS (Quem acessa o painel)
-- ==========================================
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cargo VARCHAR(50) DEFAULT 'Operador', -- 'Administrador' ou 'Operador'
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 2. TABELA DE CATEGORIAS (Para organizar os produtos)
-- ==========================================
CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(50) UNIQUE NOT NULL -- Ex: Alimento, Bebida, Sobremesa
);


-- ==========================================
-- 3. TABELA DE PRODUTOS (Seu Estoque Atual)
-- ==========================================
CREATE TABLE produtos (
    id_produto SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    id_categoria INT REFERENCES categorias(id_categoria) ON DELETE SET NULL,
    quantidade_atual INT NOT NULL DEFAULT 0 CHECK (quantidade_atual >= 0),
    quantidade_minima INT NOT NULL DEFAULT 10 CHECK (quantidade_minima >= 0),
    preco DECIMAL(10, 2) DEFAULT 0.00,
    validade DATE
);


-- ==========================================
-- 4. TABELA DE MOVIMENTAÇÕES (Entradas e Saídas/Vendas)
-- ==========================================
CREATE TABLE movimentacoes (
    id_movimentacao SERIAL PRIMARY KEY,
    id_produto INT NOT NULL REFERENCES produtos(id_produto) ON DELETE CASCADE,
    id_usuario INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    
    -- Campos específicos das suas modais dos prints:
    nota_fiscal VARCHAR(100),            -- Usado na modal de ENTRADA (opcional)
    justificativa_valor VARCHAR(255),    -- Usado na modal de SAÍDA ("R$ 15,00" ou "Consumo")
    
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- 5. TABELA DE CONFIGURAÇÕES DO SISTEMA
-- ==========================================
CREATE TABLE configuracoes (
    id_config SERIAL PRIMARY KEY,
    notificacoes_criticas BOOLEAN DEFAULT TRUE,
    exigir_nf BOOLEAN DEFAULT FALSE,
    limite_dias_vencimento INT DEFAULT 30
);


-- ==========================================
-- CARGA INICIAL DE DADOS (Baseada no seu site!)
-- ==========================================

-- Categorias Iniciais
INSERT INTO categorias (nome_categoria) VALUES 
('Alimento'), 
('Bebida'), 
('Sobremesa');

-- Usuários Iniciais (Os mesmos do seu LocalStorage)
INSERT INTO usuarios (nome, email, cargo, senha) VALUES 
('Sophia Cabral Soares', 'sophia.cabral.soares@escola.pr.gov.br', 'Administrador', 'sosopedro'),
('João Pereira', 'joao@cantina.com', 'Operador', 'joaocantina');

-- Produtos Iniciais de Exemplo
INSERT INTO produtos (nome, id_categoria, quantidade_atual, quantidade_minima, preco) VALUES 
('Polvilho 40g', 1, 20, 13, 4.50),
('Suco de Laranja', 2, 0, 10, 6.00),
('Bolo de Chocolate', 1, 10, 5, 5.00),
('Chocomilk', 2, 30, 10, 7.00);

-- Configuração Padrão
INSERT INTO configuracoes (notificacoes_criticas, exigir_nf, limite_dias_vencimento) 
VALUES (TRUE, FALSE, 30);