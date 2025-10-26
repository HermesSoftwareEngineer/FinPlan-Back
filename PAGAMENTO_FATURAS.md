# 💳 Sistema de Pagamento de Faturas - FinPlan

## 📋 Visão Geral

Sistema completo para gerenciamento e pagamento de faturas de cartão de crédito com suporte a:
- ✅ Conta padrão por fatura
- ✅ Pagamentos parciais múltiplos
- ✅ Alteração de data e conta de pagamento
- ✅ Rastreamento de origem dos movimentos
- ✅ Atualização automática de saldos

---

## 🎯 Funcionalidades Implementadas

### 1. Campo `conta_id` em Faturas
Cada fatura pode ter uma **conta padrão** associada, indicando qual conta bancária será debitada por padrão para pagar aquela fatura.

**Modelo:**
```javascript
conta_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'contas',
    key: 'id',
  },
  comment: 'Conta padrão para débito desta fatura',
}
```

### 2. Campo `origem` em Movimentos
Rastreia a origem de cada movimento financeiro:

**Valores possíveis:**
- `manual` - Movimento criado manualmente pelo usuário
- `cartao` - Movimento originado de compra no cartão
- `fatura` - Movimento de pagamento de fatura (criado automaticamente)

**Modelo:**
```javascript
origem: {
  type: DataTypes.ENUM('manual', 'cartao', 'fatura'),
  allowNull: false,
  defaultValue: 'manual',
}
```

### 3. Vinculação Fatura ↔ Movimento de Pagamento
Campo `movimento_pagamento_id` na tabela Faturas permite vincular a fatura ao seu movimento de pagamento.

**Relacionamento:**
```
Fatura 1 ─── 1 Movimento (pagamento)
```

---

## 🔄 Fluxo Automático

### Quando uma Compra é Adicionada ao Cartão:

1. **Movimento criado com `cartao_id`:**
```json
POST /movimentos
{
  "descricao": "Compra na Amazon",
  "valor": 150.00,
  "tipo": "despesa",
  "data_competencia": "2025-01-15",
  "cartao_id": 1
}
```

2. **Sistema automaticamente:**
   - ✅ Identifica a fatura correta (baseado em dia de fechamento)
   - ✅ Cria fatura se não existir
   - ✅ Cria movimento de pagamento da fatura com `origem: 'fatura'`
   - ✅ Vincula movimento de pagamento à fatura
   - ✅ Adiciona valor ao `valor_total` da fatura
   - ✅ Atualiza `limite_utilizado` do cartão
   - ✅ Marca movimento da compra com `origem: 'cartao'`

3. **Movimento de Pagamento Criado:**
```json
{
  "descricao": "Pagamento Fatura Nubank - 02/2025",
  "valor": 150.00,
  "tipo": "despesa",
  "data_competencia": "2025-02-10",
  "data_pagamento": null,
  "pago": false,
  "origem": "fatura",
  "conta_id": null,
  "categoria_id": null
}
```

---

## 💰 Rota de Pagamento de Fatura

### Endpoint
```http
POST /faturas/:id/pagar
```

### Parâmetros do Body
```json
{
  "valor_pago": 1500.00,        // OBRIGATÓRIO - valor do pagamento
  "data_pagamento": "2025-10-25", // OBRIGATÓRIO - data do pagamento
  "conta_id": 2,                  // OPCIONAL - conta de débito (se não informado, usa padrão da fatura)
  "categoria_id": 5               // OPCIONAL - categoria do movimento
}
```

### Comportamento

#### 1️⃣ Pagamento Completo
```http
POST /faturas/1/pagar
{
  "valor_pago": 2000.00,
  "data_pagamento": "2025-10-25",
  "conta_id": 2,
  "categoria_id": 5
}
```

**Resultado:**
- ✅ `fatura.valor_pago` = 2000.00
- ✅ `fatura.status` = "paga"
- ✅ `movimento_pagamento.pago` = true
- ✅ `movimento_pagamento.data_pagamento` = "2025-10-25"
- ✅ `conta.saldo_atual` -= 2000.00

**Resposta:**
```json
{
  "message": "Fatura paga completamente!",
  "fatura": { /* dados atualizados */ },
  "pagamento": {
    "valor_pago": 2000.00,
    "valor_restante": 0.00
  }
}
```

#### 2️⃣ Pagamento Parcial
```http
POST /faturas/1/pagar
{
  "valor_pago": 1000.00,
  "data_pagamento": "2025-10-10",
  "conta_id": 2
}
```

**Resultado:**
- ✅ `fatura.valor_pago` = 1000.00
- ✅ `fatura.status` = "aberta" (ainda não paga completamente)
- ✅ `movimento_pagamento.pago` = false
- ✅ `conta.saldo_atual` -= 1000.00

**Resposta:**
```json
{
  "message": "Pagamento parcial registrado com sucesso",
  "fatura": { /* dados atualizados */ },
  "pagamento": {
    "valor_pago": 1000.00,
    "valor_restante": 1000.00
  }
}
```

#### 3️⃣ Múltiplos Pagamentos Parciais
```http
# 1º Pagamento - Conta Corrente
POST /faturas/1/pagar
{
  "valor_pago": 800.00,
  "data_pagamento": "2025-10-05",
  "conta_id": 2
}

# 2º Pagamento - Poupança
POST /faturas/1/pagar
{
  "valor_pago": 700.00,
  "data_pagamento": "2025-10-15",
  "conta_id": 3
}

# 3º Pagamento - Conta Corrente novamente
POST /faturas/1/pagar
{
  "valor_pago": 500.00,
  "data_pagamento": "2025-10-20",
  "conta_id": 2
}
```

**Resultado Final:**
- ✅ `fatura.valor_pago` = 2000.00
- ✅ `fatura.status` = "paga"
- ✅ Total debitado: Conta 2 = 1300.00 | Conta 3 = 700.00

---

## 🔍 Validações

### 1. Valor Excedente
```http
POST /faturas/1/pagar
{
  "valor_pago": 2500.00,  // Fatura tem apenas 2000.00 restantes
  "data_pagamento": "2025-10-25",
  "conta_id": 2
}
```

**Resposta (400):**
```json
{
  "error": "Valor do pagamento excede o valor restante da fatura",
  "valor_restante": 2000.00
}
```

### 2. Conta Não Informada
Se a fatura não tem `conta_id` padrão e o usuário não informar no pagamento:

**Resposta (400):**
```json
{
  "error": "É necessário informar uma conta para o pagamento"
}
```

### 3. Conta Não Encontrada
```http
POST /faturas/1/pagar
{
  "valor_pago": 1500.00,
  "data_pagamento": "2025-10-25",
  "conta_id": 999  // Conta não existe
}
```

**Resposta (404):**
```json
{
  "error": "Conta não encontrada"
}
```

---

## 🎨 Exemplos de Uso

### Cenário 1: Pagamento Simples no Vencimento
```javascript
// 1. Criar fatura com conta padrão
POST /faturas
{
  "mes_referencia": 10,
  "ano_referencia": 2025,
  "data_fechamento": "2025-10-15",
  "data_vencimento": "2025-10-25",
  "cartao_id": 1,
  "conta_id": 2  // Conta Corrente Nubank
}

// 2. Adicionar compras ao cartão
POST /movimentos
{
  "descricao": "Netflix",
  "valor": 50.00,
  "data_competencia": "2025-10-05",
  "cartao_id": 1
}

// 3. Pagar fatura no vencimento
POST /faturas/1/pagar
{
  "valor_pago": 50.00,
  "data_pagamento": "2025-10-25"
  // conta_id não precisa ser informado, usa o padrão
}
```

### Cenário 2: Pagamento Antecipado com Desconto
```javascript
// Fatura de R$ 1.000,00
// Cliente paga R$ 950,00 antecipadamente

POST /faturas/1/pagar
{
  "valor_pago": 950.00,
  "data_pagamento": "2025-10-10",  // Antes do vencimento (25/10)
  "conta_id": 2
}

// Fatura fica com valor_pago = 950.00 de valor_total = 1000.00
// Restam R$ 50,00 a pagar
```

### Cenário 3: Dividir Pagamento em Duas Contas
```javascript
// Fatura de R$ 2.000,00
// Pagar metade com cada conta

// 1º Pagamento - Conta Corrente
POST /faturas/1/pagar
{
  "valor_pago": 1000.00,
  "data_pagamento": "2025-10-25",
  "conta_id": 2,
  "categoria_id": 10  // Categoria "Cartão de Crédito"
}

// 2º Pagamento - Poupança
POST /faturas/1/pagar
{
  "valor_pago": 1000.00,
  "data_pagamento": "2025-10-25",
  "conta_id": 3,
  "categoria_id": 10
}
```

---

## 📊 Estrutura de Dados

### Fatura Completa
```json
{
  "id": 1,
  "mes_referencia": 10,
  "ano_referencia": 2025,
  "data_fechamento": "2025-10-15",
  "data_vencimento": "2025-10-25",
  "valor_total": 2000.00,
  "valor_pago": 1500.00,
  "status": "aberta",
  "cartao_id": 1,
  "conta_id": 2,
  "movimento_pagamento_id": 42,
  "cartao": {
    "id": 1,
    "nome": "Nubank",
    "bandeira": "Mastercard",
    "limite": 5000.00,
    "limite_utilizado": 2000.00
  },
  "conta": {
    "id": 2,
    "nome": "Conta Corrente Nubank",
    "tipo": "corrente"
  },
  "movimento_pagamento": {
    "id": 42,
    "descricao": "Pagamento Fatura Nubank - 10/2025",
    "valor": 2000.00,
    "data_competencia": "2025-10-25",
    "data_pagamento": "2025-10-25",
    "pago": false
  }
}
```

### Movimento com Origem
```json
{
  "id": 100,
  "descricao": "Compra na Amazon",
  "valor": 150.00,
  "tipo": "despesa",
  "origem": "cartao",  // ← Indica origem do movimento
  "data_competencia": "2025-10-05",
  "data_pagamento": "2025-10-25",
  "fatura_id": 1
}
```

---

## 🚀 Próximos Passos (Sugestões)

- [ ] Implementar pagamento com juros/multa por atraso
- [ ] Histórico de pagamentos parciais
- [ ] Relatório de faturas por período
- [ ] Notificações de vencimento
- [ ] Cálculo automático de melhor dia de compra
- [ ] Análise de gastos por categoria no cartão
- [ ] Previsão de próximas faturas

---

## 📝 Observações Importantes

1. **Movimento de Pagamento é Único:**
   - Cada fatura tem apenas UM movimento de pagamento
   - Pagamentos parciais atualizam o MESMO movimento
   - O valor do movimento sempre reflete o `valor_total` da fatura

2. **Saldo de Conta:**
   - É atualizado a cada pagamento parcial
   - Débito é feito imediatamente ao registrar pagamento

3. **Status da Fatura:**
   - `aberta` - Fatura ativa, ainda não fechada
   - `fechada` - Fatura fechada, pronta para pagamento
   - `paga` - Totalmente paga
   - `atrasada` - Vencida e não paga

4. **Data de Pagamento:**
   - Pode ser alterada em cada pagamento parcial
   - Última data informada é a que fica registrada no movimento

---

## 🎯 Resumo

Este sistema permite **total flexibilidade** no pagamento de faturas:
- ✅ Pagar tudo de uma vez
- ✅ Pagar parcialmente em várias vezes
- ✅ Usar contas diferentes para cada pagamento
- ✅ Alterar data de pagamento
- ✅ Rastrear origem de todos os movimentos
- ✅ Atualização automática de saldos e status

Tudo isso mantendo a **integridade dos dados** e com **rastreamento completo** de todas as operações!
