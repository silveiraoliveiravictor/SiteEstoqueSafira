const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// ==========================================
// ROTAS DE USUÁRIOS E AUTENTICAÇÃO
// ==========================================

// Login
app.post('/api/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const result = await pool.query(
            'SELECT id_usuario, nome, email, cargo FROM usuarios WHERE email = $1 AND senha = $2',
            [email, senha]
        );
        if (result.rows.length > 0) {
            res.json({ sucesso: true, usuario: result.rows[0] });
        } else {
            res.status(401).json({ sucesso: false, mensagem: 'E-mail ou senha incorretos!' });
        }
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Cadastro de Usuário
app.post('/api/usuarios', async (req, res) => {
    const { nome, email, cargo, senha } = req.body;
    try {
        const usuarioExiste = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (usuarioExiste.rows.length > 0) {
            return res.status(400).json({ mensagem: 'Este e-mail já está cadastrado!' });
        }

        const novoUsuario = await pool.query(
            'INSERT INTO usuarios (nome, email, cargo, senha) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nome, email, cargo',
            [nome, email, cargo, senha]
        );
        res.status(201).json(novoUsuario.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Atualizar Senha do Usuário
app.put('/api/usuarios/:id/senha', async (req, res) => {
    const { id } = req.params;
    const { novaSenha } = req.body;
    try {
        await pool.query('UPDATE usuarios SET senha = $1 WHERE id_usuario = $2', [novaSenha, id]);
        res.json({ mensagem: 'Senha alterada no banco de dados com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ==========================================
// ROTAS DE PRODUTOS
// ==========================================

// Listar Produtos
app.get('/api/produtos', async (req, res) => {
    try {
        const query = `
            SELECT p.id_produto, p.nome, c.nome_categoria AS categoria, 
                   p.quantidade_atual AS qtd, p.quantidade_minima AS minimo, 
                   TO_CHAR(p.validade, 'YYYY-MM-DD') AS validade, p.fornecedor, p.preco
            FROM produtos p
            LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
            ORDER BY p.id_produto ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Cadastrar Produto
app.post('/api/produtos', async (req, res) => {
    const { nome, categoria, qtd, minimo, validade, fornecedor, id_usuario } = req.body;
    try {
        // Busca o id da categoria ou cria se não existir
        let catResult = await pool.query('SELECT id_categoria FROM categorias WHERE nome_categoria = $1', [categoria]);
        let id_categoria;
        if (catResult.rows.length === 0) {
            const novaCat = await pool.query('INSERT INTO categorias (nome_categoria) VALUES ($1) RETURNING id_categoria', [categoria]);
            id_categoria = novaCat.rows[0].id_categoria;
        } else {
            id_categoria = catResult.rows[0].id_categoria;
        }

        // Insere o produto
        const prodResult = await pool.query(
            `INSERT INTO produtos (nome, id_categoria, quantidade_atual, quantidade_minima, validade, fornecedor)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_produto`,
            [nome, id_categoria, qtd, minimo, validade || null, fornecedor]
        );

        // Registra movimentação de Carga Inicial se qtd > 0
        if (qtd > 0) {
            await pool.query(
                `INSERT INTO movimentacoes (id_produto, id_usuario, tipo, quantidade, justificativa_valor)
                 VALUES ($1, $2, 'Entrada', $3, 'Carga Inicial')`,
                [prodResult.rows[0].id_produto, id_usuario || null, qtd]
            );
        }

        res.status(201).json({ mensagem: 'Produto cadastrado com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Editar Produto
app.put('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, categoria, qtd, minimo, validade, fornecedor } = req.body;
    try {
        let catResult = await pool.query('SELECT id_categoria FROM categorias WHERE nome_categoria = $1', [categoria]);
        let id_categoria = catResult.rows.length > 0 ? catResult.rows[0].id_categoria : null;

        await pool.query(
            `UPDATE produtos 
             SET nome = $1, id_categoria = $2, quantidade_atual = $3, quantidade_minima = $4, validade = $5, fornecedor = $6
             WHERE id_produto = $7`,
            [nome, id_categoria, qtd, minimo, validade || null, fornecedor, id]
        );
        res.json({ mensagem: 'Produto atualizado com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Excluir Produto
app.delete('/api/produtos/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM produtos WHERE id_produto = $1', [id]);
        res.json({ mensagem: 'Produto removido com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ==========================================
// ROTAS DE MOVIMENTAÇÕES (ENTRADA / SAÍDA)
// ==========================================

// Listar Movimentações
app.get('/api/movimentacoes', async (req, res) => {
    try {
        const query = `
            SELECT m.id_movimentacao, p.nome AS produto, m.tipo, m.quantidade AS qtd, 
                   TO_CHAR(m.data_hora, 'DD/MM/YYYY HH24:MI') AS data, 
                   COALESCE(u.nome, 'Sistema') AS usuario, 
                   COALESCE(m.nota_fiscal, m.justificativa_valor, '-') AS infoextra
            FROM movimentacoes m
            JOIN produtos p ON m.id_produto = p.id_produto
            LEFT JOIN usuarios u ON m.id_usuario = u.id_usuario
            WHERE m.data_hora >= DATE_TRUNC('week', CURRENT_DATE) -- Reseta visualmente na segunda-feira
            ORDER BY m.data_hora ASC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Registrar Entrada
app.post('/api/movimentacoes/entrada', async (req, res) => {
    const { id_produto, quantidade, nota_fiscal, id_usuario } = req.body;
    try {
        await pool.query(
            'INSERT INTO movimentacoes (id_produto, id_usuario, tipo, quantidade, nota_fiscal) VALUES ($1, $2, $3, $4, $5)',
            [id_produto, id_usuario || null, 'Entrada', quantidade, nota_fiscal]
        );
        await pool.query(
            'UPDATE produtos SET quantidade_atual = quantidade_atual + $1 WHERE id_produto = $2',
            [quantidade, id_produto]
        );
        res.json({ mensagem: 'Entrada registrada com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Registrar Saída
app.post('/api/movimentacoes/saida', async (req, res) => {
    const { id_produto, quantidade, justificativa_valor, id_usuario } = req.body;
    try {
        const prod = await pool.query('SELECT quantidade_atual FROM produtos WHERE id_produto = $1', [id_produto]);
        if (prod.rows.length === 0 || prod.rows[0].quantidade_atual < quantidade) {
            return res.status(400).json({ mensagem: 'Quantidade insuficiente em estoque!' });
        }

        await pool.query(
            'INSERT INTO movimentacoes (id_produto, id_usuario, tipo, quantidade, justificativa_valor) VALUES ($1, $2, $3, $4, $5)',
            [id_produto, id_usuario || null, 'Saída', quantidade, justificativa_valor]
        );
        await pool.query(
            'UPDATE produtos SET quantidade_atual = quantidade_atual - $1 WHERE id_produto = $2',
            [quantidade, id_produto]
        );
        res.json({ mensagem: 'Saída registrada com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ==========================================
// ROTAS DE CONFIGURAÇÕES
// ==========================================

app.get('/api/configuracoes', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT notificacoes_criticas AS "notificacoesCriticas", exigir_nf AS "exigirNF", limite_dias_vencimento AS "limiteDiasVencimento" FROM configuracoes LIMIT 1'
        );
        res.json(result.rows[0] || { notificacoesCriticas: true, exigirNF: false, limiteDiasVencimento: 7 });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.put('/api/configuracoes', async (req, res) => {
    const { notificacoesCriticas, exigirNF, limiteDiasVencimento } = req.body;
    try {
        await pool.query(
            'UPDATE configuracoes SET notificacoes_criticas = $1, exigir_nf = $2, limite_dias_vencimento = $3 WHERE id_config = 1',
            [notificacoesCriticas, exigirNF, limiteDiasVencimento]
        );
        res.json({ mensagem: 'Configurações atualizadas no banco de dados!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(` Servidor rodando na porta ${PORT}`);
});
