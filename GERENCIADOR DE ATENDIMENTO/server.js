const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'data', 'atendimentos.json');
const ATENDENTES_FILE = path.join(__dirname, 'data', 'atendentes.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Verifica se o arquivo JSON existe, se não, cria
if (!fs.existsSync(DB_FILE)) {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(DB_FILE, '[]');
}

if (!fs.existsSync(ATENDENTES_FILE)) {
    const dir = path.join(__dirname, 'data');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    fs.writeFileSync(ATENDENTES_FILE, '[]');
}

// Rota GET - Retorna todos os atendimentos
app.get('/api/atendimentos', (req, res) => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler os dados' });
    }
});

// Rota POST - Adiciona novo atendimento
app.post('/api/atendimentos', (req, res) => {
    try {
        const novoAtendimento = {
            id: Date.now(),
            ...req.body
        };
        
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const atendimentos = JSON.parse(data);
        
        atendimentos.push(novoAtendimento);
        fs.writeFileSync(DB_FILE, JSON.stringify(atendimentos, null, 2));
        
        res.status(201).json(novoAtendimento);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar os dados' });
    }
});

// Rota PUT - Atualiza atendimento pelo ID
app.put('/api/atendimentos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = fs.readFileSync(DB_FILE, 'utf8');
        let atendimentos = JSON.parse(data);
        
        const index = atendimentos.findIndex(a => a.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }
        
        atendimentos[index] = { ...atendimentos[index], ...req.body };
        fs.writeFileSync(DB_FILE, JSON.stringify(atendimentos, null, 2));
        
        res.json(atendimentos[index]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar os dados' });
    }
});

// Rota DELETE - Remove atendimento pelo ID
app.delete('/api/atendimentos/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = fs.readFileSync(DB_FILE, 'utf8');
        let atendimentos = JSON.parse(data);
        
        const index = atendimentos.findIndex(a => a.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }
        
        atendimentos.splice(index, 1);
        fs.writeFileSync(DB_FILE, JSON.stringify(atendimentos, null, 2));
        
        res.json({ message: 'Atendimento removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover os dados' });
    }
});

// --- Rotas de Atendentes ---
app.get('/api/atendentes', (req, res) => {
    try {
        const data = fs.readFileSync(ATENDENTES_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Erro ao ler os atendentes' });
    }
});

app.post('/api/atendentes', (req, res) => {
    try {
        const novoAtendente = {
            id: Date.now(),
            nome: req.body.nome
        };
        const data = fs.readFileSync(ATENDENTES_FILE, 'utf8');
        const atendentes = JSON.parse(data);
        atendentes.push(novoAtendente);
        fs.writeFileSync(ATENDENTES_FILE, JSON.stringify(atendentes, null, 2));
        res.status(201).json(novoAtendente);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar o atendente' });
    }
});

app.delete('/api/atendentes/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const data = fs.readFileSync(ATENDENTES_FILE, 'utf8');
        let atendentes = JSON.parse(data);
        const index = atendentes.findIndex(a => a.id === id);
        if (index === -1) return res.status(404).json({ error: 'Atendente não encontrado' });
        atendentes.splice(index, 1);
        fs.writeFileSync(ATENDENTES_FILE, JSON.stringify(atendentes, null, 2));
        res.json({ message: 'Atendente removido com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover o atendente' });
    }
});

// Inicia servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
