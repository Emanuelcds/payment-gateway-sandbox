# Payment Gateway Sandbox

API de pagamento **simulada** para ambientes de teste, feita com Node.js e Express.

Ela recebe dados reais de uma compra (valor, cliente, itens), mas **não movimenta dinheiro nem consulta bancos**. A aprovação ou recusa do pagamento é decidida por **cartões de teste**, o que permite testar todos os cenários de um checkout (aprovado, recusado, sem saldo, cartão expirado) sem risco e sem custo.

> ⚠️ **Projeto para testes e estudo.** Não use em produção e **nunca envie cartões reais**: a API rejeita qualquer número que não seja um cartão de teste.

---

## Sumário

1. [Para que serve](#para-que-serve)
2. [Como o fluxo funciona](#como-o-fluxo-funciona)
3. [Tecnologias](#tecnologias)
4. [Estrutura do projeto](#estrutura-do-projeto)
5. [Como rodar](#como-rodar)
6. [Autenticação](#autenticação)
7. [Endpoints](#endpoints)
8. [Status de um pagamento](#status-de-um-pagamento)
9. [Cartões de teste](#cartões-de-teste)
10. [Códigos de erro](#códigos-de-erro)
11. [Como o código funciona](#como-o-código-funciona)
12. [Limitações](#limitações)
13. [Próximos passos](#próximos-passos)

---

## Para que serve

Quando você desenvolve uma loja online, precisa testar o que acontece quando o pagamento é aprovado, recusado ou falha. Fazer isso com um gateway real exige conta, documentos e, muitas vezes, dinheiro de verdade.

Este projeto resolve isso com um gateway falso que se comporta como um real:

- aceita os mesmos tipos de dados de uma compra de verdade;
- valida os valores (formato, total dos itens);
- devolve aprovado ou recusado conforme o cartão de teste usado;
- guarda o histórico para consulta.

---

## Como o fluxo funciona

```
Cliente finaliza a compra no site
            │
            ▼
Backend do site ──► POST /v1/payments            cria o pagamento (status: requires_payment_method)
            │
            ▼
Cliente informa o cartão
            │
            ▼
Backend do site ──► POST /v1/payments/:id/confirm   a API decide: succeeded ou failed
            │
            ▼
Site lê o status e mostra "Compra aprovada" ou "Cartão recusado"
```

Dois detalhes importantes:

- **Criar** um pagamento não cobra nada. É como abrir uma comanda: "esta compra de R$ 49,90 aguarda pagamento".
- **Confirmar** é o momento em que o cartão é "processado". Aqui a decisão sai de uma tabela de cartões de teste, não de um banco.

A API deve ser chamada pelo **backend** do seu site, nunca direto do navegador, porque a API key não pode ficar exposta ao público.

---

## Tecnologias

| Tecnologia | Para que é usada |
|---|---|
| **Node.js** (18+) | Executa o JavaScript no servidor. |
| **Express** | Biblioteca que cria o servidor e as rotas da API. |
| **dotenv** | Lê variáveis de ambiente (como a API key) do arquivo `.env`. |
| **crypto** | Módulo nativo do Node, usado para gerar ids aleatórios. |

---

## Estrutura do projeto

```
api-pagamento/
├── server.js        # Toda a API: middleware, rotas e regras
├── package.json     # Nome do projeto, scripts e dependências
├── .env             # Variáveis secretas (NÃO vai para o GitHub)
├── .env.example     # Modelo do .env, sem valores reais
├── .gitignore       # Lista do que o Git deve ignorar
├── body.json        # Exemplo de corpo para criar um pagamento
├── card.json        # Exemplo de corpo para confirmar um pagamento
└── README.md        # Este arquivo
```

| Arquivo | O que faz |
|---|---|
| `server.js` | Contém a aplicação inteira. É o arquivo que o Node executa. |
| `package.json` | Registra as bibliotecas instaladas (equivalente ao `composer.json` do PHP). |
| `.env` | Guarda configurações sensíveis, como a API key. Fica só no seu computador. |
| `.env.example` | Mostra quais variáveis existem, para quem clonar o projeto saber o que configurar. |
| `.gitignore` | Impede que `node_modules/` e `.env` sejam enviados ao repositório. |
| `body.json` e `card.json` | Arquivos de apoio para testar com curl sem se preocupar com aspas no terminal. |

---

## Como rodar

**Pré-requisitos:** [Node.js](https://nodejs.org) versão 18 ou superior e Git.

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/payment-gateway-sandbox.git
cd payment-gateway-sandbox

# 2. Instale as dependências
npm install

# 3. Crie o arquivo .env a partir do modelo
cp .env.example .env

# 4. Inicie o servidor
node server.js
```

O terminal deve mostrar `Rodando em http://localhost:4000`. Esse terminal fica ocupado com o servidor, então use **outro terminal** para fazer as requisições.

Para o servidor reiniciar sozinho quando você salvar o código:

```bash
node --watch server.js
```

Para conferir se está no ar, abra `http://localhost:4000/health` no navegador. Deve aparecer `{"ok":true}`.

### Variáveis de ambiente (`.env`)

| Variável | Descrição | Exemplo |
|---|---|---|
| `PORT` | Porta em que o servidor escuta. | `4000` |
| `API_KEY` | Chave exigida em todas as rotas `/v1`. | `sk_test_minha_chave_123` |

---

## Autenticação

Todas as rotas que começam com `/v1` exigem a API key no header `Authorization`:

```
Authorization: Bearer sk_test_minha_chave_123
```

| Situação | Resposta |
|---|---|
| Sem chave ou chave errada | `401 Unauthorized` |
| Chave correta | A requisição segue para a rota |

A rota `/health` é pública e não exige chave.

---

## Endpoints

Base URL: `http://localhost:4000`

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Verifica se o servidor está no ar (sem chave) |
| POST | `/v1/payments` | Cria um pagamento |
| GET | `/v1/payments` | Lista pagamentos (filtro opcional por status) |
| GET | `/v1/payments/:id` | Consulta um pagamento |
| POST | `/v1/payments/:id/confirm` | Confirma o pagamento com um cartão de teste |
| POST | `/v1/payments/:id/cancel` | Cancela um pagamento ainda pendente |
| POST | `/v1/payments/:id/refund` | Reembolsa um pagamento aprovado |

### Anatomia da URL

```
http://localhost:4000 / v1 / payments / pay_123 / confirm
└──── servidor ──────┘  │      │          │         └── ação
                        │      │          └── id do pagamento
                        │      └── recurso (o "quê")
                        └── versão da API
```

- **`/payments`** é o recurso. O método HTTP diz a ação: `POST` cria, `GET` consulta.
- **`/v1`** é a versão. Permite mudar a API no futuro (criando `/v2`) sem quebrar quem usa a versão antiga.

---

### `POST /v1/payments`: criar pagamento

Registra uma compra aguardando pagamento.

**Corpo da requisição:**

```json
{
  "amount": 7500,
  "currency": "brl",
  "customer": { "name": "Maria", "email": "maria@email.com" },
  "items": [
    { "name": "Camiseta", "quantity": 2, "unit_amount": 3000 },
    { "name": "Boné", "quantity": 1, "unit_amount": 1500 }
  ]
}
```

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `amount` | inteiro | sim | Valor total **em centavos** (7500 = R$ 75,00). |
| `currency` | texto | não | Moeda. Padrão: `brl`. |
| `customer.name` | texto | sim | Nome do cliente. |
| `customer.email` | texto | sim | E-mail do cliente. |
| `items` | lista | não | Itens da compra. Se enviada, a soma deve bater com `amount`. |
| `items[].quantity` | inteiro | sim, se houver itens | Quantidade. |
| `items[].unit_amount` | inteiro | sim, se houver itens | Preço unitário em centavos. |

> **Por que centavos?** Números decimais em computadores têm erros de arredondamento (por exemplo, `0.1 + 0.2` não dá exatamente `0.3`). Usar inteiros em centavos evita esse problema em valores financeiros.

**Resposta `201 Created`:**

```json
{
  "id": "pay_2d7d51d8515215b4",
  "status": "requires_payment_method",
  "amount": 7500,
  "currency": "brl",
  "customer": { "name": "Maria", "email": "maria@email.com" },
  "items": [
    { "name": "Camiseta", "quantity": 2, "unit_amount": 3000 },
    { "name": "Boné", "quantity": 1, "unit_amount": 1500 }
  ],
  "created": "2026-10-17T15:08:42.564Z"
}
```

**Exemplo com curl:**

```bash
curl -i -X POST http://localhost:4000/v1/payments \
  -H "Authorization: Bearer sk_test_minha_chave_123" \
  -H "Content-Type: application/json" \
  -d @body.json
```

---

### `GET /v1/payments`: listar pagamentos

Devolve todos os pagamentos, do mais recente para o mais antigo.

**Filtro opcional:** `?status=succeeded` (veja os status em [Status de um pagamento](#status-de-um-pagamento)).

```bash
curl -i -H "Authorization: Bearer sk_test_minha_chave_123" \
  "http://localhost:4000/v1/payments?status=succeeded"
```

**Resposta `200 OK`:**

```json
{ "data": [ { "id": "pay_...", "status": "succeeded", "...": "..." } ] }
```

Se nenhum pagamento tiver o status pedido, a resposta é `{"data":[]}`, o que não é erro.

---

### `GET /v1/payments/:id`: consultar pagamento

Devolve um pagamento específico. É por aqui que o site descobre o resultado olhando o campo `status`.

```bash
curl -i -H "Authorization: Bearer sk_test_minha_chave_123" \
  http://localhost:4000/v1/payments/pay_2d7d51d8515215b4
```

Resposta `200 OK` com o pagamento, ou `404` se o id não existir.

---

### `POST /v1/payments/:id/confirm`: confirmar pagamento

Simula o processamento do cartão. O resultado depende do número do cartão (veja [Cartões de teste](#cartões-de-teste)).

**Corpo da requisição:**

```json
{
  "card": {
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 2030,
    "cvc": "123"
  }
}
```

| Campo | Descrição |
|---|---|
| `card.number` | Número do cartão de teste (espaços e hífens são ignorados). |
| `card.exp_month` | Mês de validade (1 a 12). |
| `card.exp_year` | Ano de validade com 4 dígitos. |
| `card.cvc` | Código de segurança, 3 ou 4 dígitos. |

**Resposta de sucesso (`200 OK`):**

```json
{
  "id": "pay_2d7d51d8515215b4",
  "status": "succeeded",
  "amount": 7500,
  "card": { "last4": "4242" },
  "failure": null,
  "paid_at": "2026-10-17T15:10:03.120Z"
}
```

**Resposta de cartão recusado (`200 OK`, com `status: failed`):**

```json
{
  "id": "pay_2d7d51d8515215b4",
  "status": "failed",
  "card": { "last4": "0002" },
  "failure": { "code": "card_declined", "message": "Cartão recusado." }
}
```

Observe que uma **recusa não é erro HTTP**: a requisição foi processada normalmente e o resultado do pagamento é que foi "recusado". Quem usa a API deve olhar o campo `status`.

**Regras:**

- Só é possível confirmar pagamentos em `requires_payment_method` ou `failed` (permite tentar de novo com outro cartão após uma falha).
- Um pagamento já aprovado não pode ser confirmado de novo (`409`).
- Por segurança, só os **4 últimos dígitos** do cartão são guardados.

```bash
curl -i -X POST http://localhost:4000/v1/payments/pay_2d7d51d8515215b4/confirm \
  -H "Authorization: Bearer sk_test_minha_chave_123" \
  -H "Content-Type: application/json" \
  -d @card.json
```

### `POST /v1/payments/:id/cancel`: cancelar pagamento

Cancela um pagamento que ainda esteja em `requires_payment_method`.

- Só é permitido cancelar pagamentos pendentes.
- Se o pagamento já foi aprovado, recusado ou reembolsado, a API responde `409`.
- O estado vira `canceled`.

```bash
curl -i -X POST http://localhost:4000/v1/payments/pay_2d7d51d8515215b4/cancel \
  -H "Authorization: Bearer sk_test_minha_chave_123"
```

**Resposta `200 OK`:**

```json
{
  "id": "pay_2d7d51d8515215b4",
  "status": "canceled",
  "amount": 7500,
  "currency": "brl",
  "customer": { "name": "Maria", "email": "maria@email.com" }
}
```

### `POST /v1/payments/:id/refund`: reembolsar pagamento

Reembolsa um pagamento que já foi aprovado com sucesso (`succeeded`).

- Funciona somente quando o status atual é `succeeded`.
- O status é alterado para `refunded`.
- O campo `refunded_at` registra o momento do reembolso.

```bash
curl -i -X POST http://localhost:4000/v1/payments/pay_2d7d51d8515215b4/refund \
  -H "Authorization: Bearer sk_test_minha_chave_123"
```

**Resposta `200 OK`:**

```json
{
  "id": "pay_2d7d51d8515215b4",
  "status": "refunded",
  "amount": 7500,
  "currency": "brl",
  "refunded_at": "2026-10-17T15:12:05.000Z"
}
```

---

## Status de um pagamento

| Status | Significado | Como chega nele |
|---|---|---|
| `requires_payment_method` | Criado, aguardando o cartão. | Ao criar o pagamento. |
| `succeeded` | Aprovado. | Confirmar com cartão aprovado. |
| `failed` | Recusado ou com erro. | Confirmar com cartão recusado/expirado. |
| `canceled` | Cancelado antes do processamento. | Chamada a `POST /v1/payments/:id/cancel`. |
| `refunded` | Reembolsado após aprovação. | Chamada a `POST /v1/payments/:id/refund`. |

```
requires_payment_method ──confirm──► succeeded
         │
         ├──confirm──► failed ──confirm (nova tentativa)──► succeeded / failed
         │
         └──cancel──► canceled

succeeded ──refund──► refunded
```

---

## Cartões de teste

| Número | Resultado | Código |
|---|---|---|
| `4242 4242 4242 4242` | Aprovado | `succeeded` |
| `4000 0000 0000 0002` | Recusado | `card_declined` |
| `4000 0000 0000 9995` | Saldo insuficiente | `insufficient_funds` |

Além disso:

- **Cartão expirado:** qualquer cartão da lista com validade no passado resulta em `failed` com `expired_card`.
- **Qualquer outro número** (inclusive cartões reais) é rejeitado com `400 invalid_test_card` e **não é processado**.

---

## Códigos de erro

Todo erro tem o mesmo formato:

```json
{ "error": { "code": "invalid_amount", "message": "Texto explicando o problema." } }
```

| HTTP | Código | Quando acontece |
|---|---|---|
| 400 | `invalid_amount` | `amount` não é inteiro ou é menor/igual a zero. |
| 400 | `invalid_customer` | Faltou `customer.name` ou `customer.email`. |
| 400 | `amount_mismatch` | A soma dos itens não bate com o `amount`. |
| 400 | `invalid_test_card` | Número de cartão fora da lista de teste. |
| 400 | `invalid_cvc` | CVC não tem 3 ou 4 dígitos. |
| 401 | `unauthorized` | API key ausente ou incorreta. |
| 404 | `not_found` | Pagamento com esse id não existe. |
| 409 | `invalid_state` | Tentou confirmar, cancelar ou reembolsar um pagamento em estado inválido para a ação. |

Os grupos de status HTTP seguem o padrão: **4xx** é erro de quem chamou a API (dados errados, sem permissão) e **2xx** é sucesso.

---

## Como o código funciona

Esta seção explica o `server.js` por partes.

### 1. Configuração inicial

```js
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());
```

- `require(...)` importa bibliotecas, como o `require` do PHP.
- `dotenv.config()` lê o `.env` e disponibiliza os valores em `process.env`. Precisa vir primeiro.
- `express()` cria a aplicação.
- `app.use(express.json())` ensina o servidor a ler JSON enviado no corpo das requisições. Sem isso, `req.body` chega vazio.

### 2. Armazenamento em memória

```js
const payments = new Map();
```

Um `Map` é uma coleção de pares chave → valor, como um array associativo do PHP. Aqui a chave é o id do pagamento e o valor é o pagamento. Como fica na memória do processo, **os dados somem quando o servidor reinicia**.

### 3. Middleware de autenticação

```js
app.use('/v1', (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token !== API_KEY) {
    return res.status(401).json({ error: { code: 'unauthorized', message: 'API key inválida.' } });
  }
  next();
});
```

Um **middleware** é uma função que roda *antes* da rota e decide se a requisição pode passar.

- `req` é a requisição que chegou, e `res` é a resposta que será devolvida.
- Lê o header `Authorization`, remove o prefixo `Bearer ` e compara com a chave do `.env`.
- Se não bater, responde `401` e **para** (`return`).
- Se bater, chama `next()`, que libera a requisição para a rota.
- A **ordem importa**: o `/health` está declarado antes do middleware, por isso é público.

### 4. Criar pagamento

```js
const { amount, currency = 'brl', customer, items = [] } = req.body;
```

Isso é **desestruturação**: tira vários campos do corpo da requisição de uma vez. O `= 'brl'` e o `= []` são valores padrão para campos que não vierem.

As validações seguem uma regra simples: confira cada condição, e se algo estiver errado, `return` com um erro `400`. Só chega ao final se tudo estiver certo.

A soma dos itens usa `reduce`:

```js
const total = items.reduce((soma, item) => soma + item.quantity * item.unit_amount, 0);
```

`reduce` percorre uma lista acumulando um resultado (como o `array_reduce` do PHP). Em português: "comece com 0 e, para cada item, some quantidade × preço unitário ao total". Os nomes `soma` e `item` são escolhidos por quem escreve o código.

Exemplo: `[{quantity:2, unit_amount:3000}, {quantity:1, unit_amount:1500}]` → `0 + 6000 + 1500 = 7500`.

O id é gerado assim:

```js
'pay_' + crypto.randomBytes(8).toString('hex')
```

Gera 8 bytes aleatórios e os converte para texto hexadecimal, resultando em algo como `pay_9f2a41c0b7d3e851`. A resposta usa `201` (criado com sucesso).

### 5. Listar pagamentos

```js
let lista = [...payments.values()].reverse();
if (req.query.status) {
  lista = lista.filter((p) => p.status === req.query.status);
}
```

- `payments.values()` devolve os pagamentos guardados, e o `[...]` (spread) os transforma em uma lista comum.
- `.reverse()` coloca os mais novos primeiro.
- `req.query.status` lê o que vem depois do `?` na URL.
- `.filter()` mantém só os itens que passam no teste (como o `array_filter` do PHP).

### 6. Consultar por id

```js
app.get('/v1/payments/:id', ...)
```

O `:id` é um **parâmetro de rota**: o valor que o cliente colocou na URL chega em `req.params.id`. A rota busca no `Map` e devolve `404` se não encontrar.

### 7. Confirmar pagamento

```js
app.post('/v1/payments/:id/confirm', async (req, res) => { ... });
```

A sequência de verificações é:

1. O pagamento existe? Se não, `404`.
2. Está em um estado que permite confirmar? Se não, `409`.
3. O cartão está na lista de teste? Se não, `400`. É a proteção contra cartões reais.
4. O CVC tem 3 ou 4 dígitos? (validado com uma expressão regular: `/^\d{3,4}$/`).
5. Espera 600 ms para simular a operadora.
6. Decide o resultado: expirado → `failed`; cartão com `ok: false` → `failed`; senão → `succeeded`.

Detalhes:

- `async` e `await` permitem "esperar" o `setTimeout` sem travar o servidor para outras requisições. É a versão não bloqueante do `sleep()` do PHP.
- `new Date(exp_year, exp_month, 1)` cria o **primeiro dia do mês seguinte** à validade. Os meses em JavaScript começam em 0, então passar `12` resulta em janeiro do ano seguinte, o que representa corretamente "vale até o fim de dezembro".
- `String(number).replace(/\s|-/g, '')` remove espaços e hífens, para aceitar `4242 4242 4242 4242`.
- Só `num.slice(-4)` (os 4 últimos dígitos) é guardado, nunca o cartão inteiro.

### 8. Subir o servidor

```js
app.listen(PORT, () => { console.log(`Rodando em http://localhost:${PORT}`); });
```

Liga o servidor na porta configurada e imprime uma mensagem. Deve ser a **última** coisa do arquivo.

---

## Limitações

- **Dados em memória:** reiniciar o servidor apaga todos os pagamentos.
- **Sem webhooks** (ainda): não existe notificação assinada quando o status muda.
- **Sem limite de requisições** (rate limit), sem HTTPS e sem logs estruturados.
- **Chave única:** uma só API key para todos.
- Feito para **desenvolvimento e testes**. Não é seguro nem completo o suficiente para produção.

---

## Próximos passos

- [ ] Webhooks assinados (HMAC) avisando o site quando um pagamento muda de status
- [ ] Chave de idempotência (`Idempotency-Key`) para evitar pagamentos duplicados em retries
- [ ] Persistência em banco de dados (SQLite ou PostgreSQL)
- [ ] Testes automatizados
- [ ] Dockerfile
- [ ] Documentação OpenAPI/Swagger
- [ ] Exemplo de integração com um backend PHP

---

## Licença

Distribuído sob a licença MIT. Veja o arquivo `LICENSE` para mais informações.
