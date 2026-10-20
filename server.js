require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY;

const payments = new Map();

// Únicos cartões aceitos. O resultado depende só do número.
const TEST_CARDS = {
  '4242424242424242': { ok: true },
  '4000000000000002': { ok: false, code: 'card_declined', message: 'Cartão recusado.' },
  '4000000000009995': { ok: false, code: 'insufficient_funds', message: 'Saldo insuficiente.' },
};

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

  next();
});

// Criar pagamento
app.post('/v1/payments', (req, res) => {
  const { amount, currency = 'brl', customer, items = [] } = req.body;

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

  if (items.length > 0) {
    const total = items.reduce((soma, item) => soma + item.quantity * item.unit_amount, 0);
    if (total !== amount) {
      return res.status(400).json({
        error: { code: 'amount_mismatch', message: `A soma dos itens (${total}) difere do amount (${amount}).` },
      });
    }
  }

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
  res.status(201).json(payment);
});

// Listar pagamentos (filtro opcional: ?status=succeeded)
app.get('/v1/payments', (req, res) => {
  let lista = [...payments.values()].reverse();

  if (req.query.status) {
    lista = lista.filter((p) => p.status === req.query.status);
  }

  res.json({ data: lista });
});

// Consultar um pagamento
app.get('/v1/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      error: { code: 'not_found', message: 'Pagamento não encontrado.' },
    });
  }

  res.json(payment);
});

// Confirmar pagamento com cartão de teste
app.post('/v1/payments/:id/confirm', async (req, res) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      error: { code: 'not_found', message: 'Pagamento não encontrado.' },
    });
  }

  if (!['requires_payment_method', 'failed'].includes(payment.status)) {
    return res.status(409).json({
      error: { code: 'invalid_state', message: `Pagamento já está "${payment.status}".` },
    });
  }

  const { number = '', exp_month, exp_year, cvc } = req.body.card || {};
  const num = String(number).replace(/\s|-/g, '');
  const rule = TEST_CARDS[num];

  if (!rule) {
    return res.status(400).json({
      error: { code: 'invalid_test_card', message: 'Use apenas os cartões de teste. Nunca envie cartões reais.' },
    });
  }

  if (!/^\d{3,4}$/.test(String(cvc))) {
    return res.status(400).json({
      error: { code: 'invalid_cvc', message: 'CVC inválido.' },
    });
  }

  // Simula o tempo de resposta de uma operadora
  await new Promise((resolve) => setTimeout(resolve, 600));

  const expired = new Date(exp_year, exp_month, 1) <= new Date();

  // Guardamos só os 4 últimos dígitos, nunca o número completo
  payment.card = { last4: num.slice(-4) };

  if (expired) {
    payment.status = 'failed';
    payment.failure = { code: 'expired_card', message: 'Cartão expirado.' };
  } else if (!rule.ok) {
    payment.status = 'failed';
    payment.failure = { code: rule.code, message: rule.message };
  } else {
    payment.status = 'succeeded';
    payment.failure = null;
    payment.paid_at = new Date().toISOString();
  }

  res.json(payment);
});

app.post('/v1/payments/:id/cancel', (req, res) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      error: { code: 'not_found', message: 'Pagamento não encontrado.' },
    });
  };

  if (payment.status !== 'requires_payment_method') {
    return res.status(409).json({
      error: { code: 'invalid_state', state: payment.status, message: `Pagamento já está "${payment.status}".`}
    });
  }

  payment.status = 'canceled';
  res.json(payment);
});

app.post('/v1/payments/:id/refund', (req, res) => {
  const payment = payments.get(req.params.id);

  if (!payment) {
    return res.status(404).json({
      error: { code: 'not_found', message: 'Pagamento não encontrado.' }
    });
  }

  if (payment.status !== 'succeeded') {
    return res.status(409).json({
      error: { code: 'invalid_state', state: payment.status, message: `Pagamento não está "succeeded".` }
    });
  } else {
    payment.status = 'refunded';
    payment.refunded_at = new Date().toISOString();
    res.json(payment);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Erro interno do servidor.' },
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: { code: 'not_found', message: 'Rota não encontrada.' },
  });
});

app.listen(PORT, () => {
  console.log(`Rodando em http://localhost:${PORT}`);
});