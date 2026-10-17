const express = require('express');
const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(4000, () => {
  console.log('Rodando em http://localhost:4000');
});