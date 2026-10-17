require('dotenv').config(); // precisa ser a primeira linha
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY;
const payments = new Map();

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

app.post('/v1/payments', (req, res) => {
  const { amount, currency = 'brl', customer, items = [] } = req.body;

  // 1. Validações
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({
      error: { code: 'invalid_amount', message: 'amount deve ser inteiro em centavos, maior que zero.' },
    });
  }

  if (!customer || !customer.name || !customer.email) {
    return res.status(400).json({
      error: { code: 'invalid_customer', message: 'customer precisa de name e email.' },
    });
  }

  // 2. Se vieram itens, a soma deve bater com o amount
  if (items.length > 0) {
    const total = items.reduce((soma, item) => soma + item.quantity * item.unit_amount, 0);
    if (total !== amount) {
      return res.status(400).json({
        error: { code: 'amount_mismatch', message: `A soma dos itens (${total}) difere do amount (${amount}).` },
      });
    }
  }
  
  

  // 3. Montar e guardar o pagamento
  const payment = {
    id: 'pay_' + crypto.randomBytes(8).toString('hex'),
    status: 'requires_payment_method',
    amount,
    currency,
    customer,
    items,
    created: new Date().toISOString(),
  };

  payments.set(payment.id, payment);

  // 4. 201 = "criado com sucesso"
  res.status(201).json(payment);
});

app.get('/v1/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      error: { code: 'not_found', message: 'Pagamento não encontrado.' },
    });
  }

  res.json(payment);
});

app.listen(PORT, () => {
  console.log(`Rodando em http://localhost:${PORT}`);
});