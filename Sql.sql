CREATE DATABASE cantina_escolar;
USE cantina_escolar;

-- 1. Tabela de Usuários (Ex: Ana Silva, João P., Maria S.)
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cargo VARCHAR(50) DEFAULT 'Operador',
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- 2. Tabela de Fornecedores (Ex: Distribuidora ABC, Alimentos XYZ)
CREATE TABLE fornecedores (
    id_fornecedor INT AUTO_INCREMENT PRIMARY KEY,
    nome_empresa VARCHAR(100) NOT NULL,
    contato VARCHAR(50),
    telefone VARCHAR(20)
);

-- 3. Tabela de Produtos (Estoque Atual)
CREATE TABLE produtos (
    id_produto INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    categoria VARCHAR(50) NOT NULL, -- Alimento, Bebida, Laticínio, Snack
    quantidade_atual INT NOT NULL DEFAULT 0,
    quantidade_minima INT NOT NULL DEFAULT 10,
    status_critico VARCHAR(20) AS (
        CASE 
            WHEN quantidade_atual <= (quantidade_minima * 0.3) THEN 'Crítico'
            WHEN quantidade_atual <= quantidade_minima THEN 'Baixo'
            ELSE 'OK'
        END
    ),
    validade DATE,
    id_fornecedor INT,
    FOREIGN KEY (id_fornecedor) REFERENCES fornecedores(id_fornecedor)
);

-- 4. Tabela de Movimentações (Histórico de Entradas e Saídas)
CREATE TABLE movimentacoes (
    id_movimentacao INT AUTO_INCREMENT PRIMARY KEY,
    id_produto INT NOT NULL,
    id_usuario INT NOT NULL,
    tipo_movimentacao ENUM('Entrada', 'Saída') NOT NULL,
    quantidade INT NOT NULL,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    nota_fiscal VARCHAR(50), -- Preenchido apenas em Entradas
    valor_venda DECIMAL(10, 2), -- Preenchido apenas em Saídas
    FOREIGN KEY (id_produto) REFERENCES produtos(id_produto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

-- --- DADOS INICIAIS DE EXEMPLO (Baseado nas suas imagens) ---
INSERT INTO usuarios (nome, cargo, email, senha) VALUES 
('Ana Silva', 'Administradora', 'ana@cantina.com', '123456'),
('Maria S.', 'Operador', 'maria@cantina.com', '123456'),
('João P.', 'Operador', 'joao@cantina.com', '123456'),
('Carlos L.', 'Operador', 'carlos@cantina.com', '123456');

INSERT INTO fornecedores (nome_empresa) VALUES 
('Distribuidora ABC'), ('Alimentos XYZ'), ('Bebidas Sul'), ('Padaria Local'), ('Laticínios Norte'), ('Snacks Brasil');

INSERT INTO produtos (nome, categoria, quantidade_atual, quantidade_minima, validade, id_fornecedor) VALUES
('Arroz Branco 5kg', 'Alimento', 45, 10, '2026-09-30', 1),
('Feijão Preto 1kg', 'Alimento', 8, 15, '2026-12-15', 1),
('Óleo de Soja 900ml', 'Alimento', 22, 8, '2026-11-20', 2),
('Macarrão Espaguete', 'Alimento', 18, 10, '2026-08-01', 2),
('Refrigerante 2L', 'Bebida', 36, 12, '2026-06-30', 3),
('Suco de Caixa 200ml', 'Bebida', 3, 20, '2026-06-25', 3),
('Pão de Forma', 'Alimento', 7, 10, '2026-06-13', 4),
('Leite Integral 1L', 'Laticínio', 28, 10, '2026-06-13', 5),
('Iogurte Natural 500g', 'Laticínio', 12, 8, '2026-06-12', 5),
('Biscoito Recheado', 'Snack', 55, 15, '2026-10-15', 6);

SELECT * FROM PRODUTOS
