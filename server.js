require('dotenv').config(); // precisa ser a primeira linha
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY;

// Rota pública, sem chave
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Middleware: tudo que começar com /v1 exige a chave
app.use('/v1', (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');

  if (token !== API_KEY) {
    return res.status(401).json({
      error: { code: 'unauthorized', message: 'API key inválida.' },
    });
  }

  next(); // chave certa: deixa a requisição seguir para a rota
});

// Rota de teste temporária, só para provar que a proteção funciona
app.get('/v1/ping', (req, res) => {
  res.json({ pong: true });
});

app.listen(PORT, () => {
  console.log(`Rodando em http://localhost:${PORT}`);
});