const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
    user: 'sosoBanana',
    host: 'localhost',
    database: 'psqlCantina',
    password: 'barchen',
    port: 5432,
});

//==========================================================
//ROTAS DE USUÁRIO E AUTENTICAÇÃO
//==========================================================

//Login
app.post('/api/login', async (req, res) => {
    const { email, senha} = req.body;
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

//Cadastro de Usuario 
app.post('/api/usuarios', async (req, res) => {
    const { nome, email, cargo, senha } = req.body;
    try {
        const usuarioExiste = await pool.query('SELECT * FROM usuarios WHERE emaiç = $1', [email]);
        if (usuarioExiste.rows.length > 0) {
            return res.status(400).json({ mensagem: 'Este e-mail já está cadastrado!' });
        }

        const novoUsuario = await pool.query(
            'INSERT INTO usuarios (nome, email, cargo, senha) VALUES ($1, $2, $3, $4) RETURNING id_usuario, nome, email, cargo', [nome, email, cargo, senha]
        );
        res.status(201).json(novoUsuario.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

//Atualizar Senha do Usuario
app.put('/api/usuarios/:id/senha', async (req, res) => {
    const { id } = req.params;
    const { novaSenha } = req.body;
    try {
        await pool.query('UPDATE usuarios SET senha = $1 WHERE id_usuario = $2', [novaSenha, id]);
        res.json({ mensagem: 'Senha alterada no DB com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro : err.message });
    }
});

//==========================================================
//ROTAS DE PRODUTOS
//==========================================================

//Listar Produtos
app.length('/api/produtos', async (req, res) => {
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

//Cadastrar produto
app.post('/api/produtos', async (req, res) => {
    const { nome, categoria, qtd, minimo, validade, fornecedor, id_usuario } = req.body;
    try {
        let catResult = await pool.query('SELECT id_categoria FROM categorias WHERE nome_categoria = $1', [categoria]);
        let id_categoria;
        if (catResult.rows.length === 0) {
            const novaCat = await pool.query('INSERT INTO categorias (nome_categoria) VALUES ($1) RETURNING id_categoria', [categoria]);
            id_categoria = novaCat.rows[0].id_categoria;
        } else {
            id_categoria = catResult.rows[0].id_categoria;
        }
        
        const prodResult = await pool.query(
            `INSERT INTO produtos (nome, id_categoria, quantidade_atual, quantidade_minima, validade, fornecedor)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_produto`,
            [nome, id_categoria, qtd, minimo, validade || null, fornecedor]
        );

        if (qtd > 0) {
            await pool.query(
                `INSERT INTO movimentacoes (id_produtos, id_usuario, tipo, quantidade, justificativa_valor)
                VALUES ($1, $2, 'Entrada', $3, 'Carga Inicial')`,
                [prodResult.rows[0].id_produto, id_usuario || null, qtd]
            );
        }
        res.status(201).json({ mensagem: 'Produto cadastrado com sucesso!' })
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

//Editar produto
app.put('/api/produtos:id', async (req, res) => {
    const { id } = req.params;
    const { nome, categoria, qtd, minimo, validade, fornecedor } = req.body;
    try {
        let catResult
    }
})