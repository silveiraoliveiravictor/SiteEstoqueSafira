-- Database: cantinaSafira

-- DROP DATABASE IF EXISTS "cantinaSafira";

--CREATE DATABASE "cantinaSafira"
    --WITH
    --OWNER = postgres
    --ENCODING = 'UTF8'
    --LC_COLLATE = 'Portuguese_Brazil.1252'
    --LC_CTYPE = 'Portuguese_Brazil.1252'
    --LOCALE_PROVIDER = 'libc'
    --TABLESPACE = pg_default
    --CONNECTION LIMIT = -1
    --IS_TEMPLATE = False;

-- LIMPEZA DO BANCO DE DADOS (Para permitir reexecução sem erros)
DROP TABLE IF EXISTS movimentacoes_estoque CASCADE;
DROP TABLE IF EXISTS itens_pedido CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS fornecedores CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 1. TABELA DE USUÁRIOS (Funcionários da cantina / Administradores do site)
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50) DEFAULT 'Atendente',
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE CLIENTES (Alunos, Professores e Funcionários da escola que usam o site)
CREATE TABLE clientes (
    id_cliente SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo_cliente VARCHAR(20) NOT NULL CHECK (tipo_cliente IN ('Aluno', 'Professor', 'Funcionário')),
    matricula VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    -- Saldo caso a cantina trabalhe com sistema de crédito pré-pago
    saldo_prepago DECIMAL(10, 2) DEFAULT 0.00 CHECK (saldo_prepago >= 0), 
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE CATEGORIAS (Organização do cardápio do site)
CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nome_categoria VARCHAR(50) UNIQUE NOT NULL, -- Salgados, Bebidas, Doces, Almoço
    descricao TEXT
);

-- 4. TABELA DE FORNECEDORES (Quem abastece a cantina)
CREATE TABLE fornecedores (
    id_fornecedor SERIAL PRIMARY KEY,
    nome_empresa VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    contato VARCHAR(50),
    telefone VARCHAR(20)
);


-- 5. TABELA DE PRODUTOS (Cardápio e Estoque)
CREATE TABLE produtos (
    id_produto SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    id_categoria INT NOT NULL,
    id_fornecedor INT NOT NULL,
    preco_custo DECIMAL(10, 2) NOT NULL CHECK (preco_custo >= 0),
    preco_venda DECIMAL(10, 2) NOT NULL CHECK (preco_venda >= 0),
    quantidade_atual INT NOT NULL DEFAULT 0 CHECK (quantidade_atual >= 0),
    quantidade_minima INT NOT NULL DEFAULT 10 CHECK (quantidade_minima >= 0),
    
    -- Coluna gerada automaticamente para o painel do administrador
    status_critico VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN quantidade_atual <= (quantidade_minima * 0.3) THEN 'Crítico'
            WHEN quantidade_atual <= quantidade_minima THEN 'Baixo'
            ELSE 'OK'
        END
    ) STORED,
    
    validade DATE,
    disponivel_no_site BOOLEAN DEFAULT TRUE, -- Ativa/Desativa o produto no site
    
    -- Relacionamentos 
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria),
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedores(id_fornecedor)
);

-- 6. TABELA DE PEDIDOS (Vendas realizadas pelo site ou balcão)
CREATE TABLE pedidos (
    id_pedido SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL, -- Quem comprou
    id_usuario INT,          -- Qual funcionário entregou/バリdou (pode ser nulo se for auto-atendimento no site)
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status_pedido VARCHAR(20) DEFAULT 'Pendente' CHECK (status_pedido IN ('Pendente', 'Preparando', 'Pronto', 'Entregue', 'Cancelado')),
    forma_pagamento VARCHAR(30) NOT NULL CHECK (forma_pagamento IN ('Saldo Pré-pago', 'Cartão', 'Pix', 'Dinheiro')),
    status_pagamento VARCHAR(20) DEFAULT 'Aprovado' CHECK (status_pagamento IN ('Pendente', 'Aprovado', 'Cancelado')),
    
    -- Relacionamentos (Tabelas Diferentes)
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- 7. TABELA DE ITENS DO PEDIDO (Relação de muitos para muitos entre Pedidos e Produtos)
CREATE TABLE itens_pedido (
    id_item SERIAL PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_produto INT NOT NULL,
    quantidade INT NOT NULL CHECK (quantidade > 0),
    preco_unitario DECIMAL(10, 2) NOT NULL, -- Salva o preço do momento da compra
    
    -- Coluna gerada: Calcula automaticamente o subtotal do item
    subtotal DECIMAL(10, 2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    
    -- Relacionamentos (Tabelas Diferentes)
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_produto) REFERENCES produtos(id_produto)
);


-- 8. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (Histórico de Entradas e Perdas)
CREATE TABLE movimentacoes_estoque (
    id_movimentacao SERIAL PRIMARY KEY,
    id_produto INT NOT NULL,
    id_usuario INT NOT NULL, -- Funcionário que registrou a movimentação
    tipo_movimentacao VARCHAR(10) NOT NULL CHECK (tipo_movimentacao IN ('Entrada', 'Saída/Perda')),
    quantidade INT NOT NULL CHECK (quantidade > 0),
    motivo VARCHAR(255), -- Ex: "Compra com fornecedor", "Produto vencido", "Salgado quebrou"
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Relacionamentos 
    FOREIGN KEY (id_produto) REFERENCES produtos(id_produto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);