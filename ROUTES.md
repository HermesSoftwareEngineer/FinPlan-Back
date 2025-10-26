# Documentação da API - FinPlan

## 🔐 Autenticação

Todas as rotas (exceto `/auth/*` e `/health`) requerem autenticação via token JWT no header:
```
Authorization: Bearer {seu_token}
```

---

## 📚 Endpoints

### Health Check
```http
GET /health
```

---

### 👤 Autenticação

#### Cadastro
```http
POST /auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

#### Perfil
```http
GET /user/profile
Authorization: Bearer {token}
```

---

### 💰 Contas

#### Listar Contas
```http
GET /contas
Authorization: Bearer {token}
```

#### Buscar Conta
```http
GET /contas/:id
Authorization: Bearer {token}
```

#### Criar Conta
```http
POST /contas
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Conta Corrente",
  "tipo": "corrente",
  "saldo_inicial": 1000.00,
  "cor": "#4CAF50",
  "ativa": true
}
```

**Tipos de conta:** `corrente`, `poupanca`, `investimento`, `dinheiro`

#### Atualizar Conta
```http
PUT /contas/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Conta Atualizada",
  "tipo": "poupanca",
  "cor": "#2196F3"
}
```

#### Deletar Conta
```http
DELETE /contas/:id
Authorization: Bearer {token}
```

#### Ajustar Saldo Inicial
```http
PATCH /contas/:id/ajustar-saldo-inicial
Authorization: Bearer {token}
Content-Type: application/json

{
  "novo_saldo_inicial": 1500.00
}
```

**Descrição:** Ajusta o saldo inicial da conta. A diferença entre o saldo antigo e o novo é automaticamente aplicada ao saldo atual.

**Exemplo de retorno:**
```json
{
  "message": "Saldo inicial ajustado com sucesso",
  "conta": {
    "id": 1,
    "nome": "Conta Corrente",
    "saldo_inicial": 1500.00,
    "saldo_atual": 2500.00,
    ...
  },
  "ajuste": {
    "saldo_inicial_anterior": 1000.00,
    "novo_saldo_inicial": 1500.00,
    "diferenca": 500.00
  }
}
```

#### Lançar Ajuste de Saldo
```http
POST /contas/:id/lancar-ajuste-saldo
Authorization: Bearer {token}
Content-Type: application/json

{
  "valor_ajuste": -50.00,
  "descricao": "Correção de saldo - taxa bancária não lançada",
  "data_competencia": "2025-10-26"
}
```

**Descrição:** Cria um movimento automático de ajuste de saldo. Valores positivos geram receitas, valores negativos geram despesas.

**Campos:**
- `valor_ajuste` (obrigatório) - Valor do ajuste (positivo ou negativo)
- `descricao` (opcional) - Descrição personalizada do ajuste
- `data_competencia` (opcional) - Data do movimento (padrão: data atual)

**Exemplo de retorno:**
```json
{
  "message": "Ajuste de saldo lançado com sucesso",
  "movimento": {
    "id": 15,
    "descricao": "Correção de saldo - taxa bancária não lançada",
    "valor": 50.00,
    "tipo": "despesa",
    "data_competencia": "2025-10-26",
    "data_pagamento": "2025-10-26",
    "pago": true,
    "observacao": "Movimento automático de ajuste de saldo",
    ...
  },
  "conta": {
    "id": 1,
    "nome": "Conta Corrente",
    "saldo_anterior": 2000.00,
    "saldo_atual": 1950.00,
    "ajuste": -50.00
  }
}
```

---

### 📂 Categorias

#### Listar Categorias
```http
GET /categorias
Authorization: Bearer {token}

# Filtrar por tipo (opcional)
GET /categorias?tipo=despesa
GET /categorias?tipo=receita
```

---

### 🏷️ Grupos de Categorias

#### Listar Grupos
```http
GET /grupos-categorias
Authorization: Bearer {token}
```

**Retorna grupos com suas categorias associadas.**

#### Buscar Grupo
```http
GET /grupos-categorias/:id
Authorization: Bearer {token}
```

#### Criar Grupo
```http
POST /grupos-categorias
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Despesas Fixas",
  "descricao": "Gastos mensais fixos e previsíveis",
  "cor": "#2196F3",
  "icone": "repeat"
}
```

**Exemplos de grupos:**
- Despesas Fixas (aluguel, internet, telefone)
- Despesas Variáveis (alimentação, transporte, lazer)
- Investimentos (ações, fundos, previdência)
- Receitas Fixas (salário, aluguel recebido)
- Receitas Variáveis (freelance, bônus)

#### Atualizar Grupo
```http
PUT /grupos-categorias/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Despesas Essenciais",
  "descricao": "Gastos essenciais do mês"
}
```

#### Deletar Grupo
```http
DELETE /grupos-categorias/:id
Authorization: Bearer {token}
```

**Nota:** Ao deletar um grupo, as categorias associadas não são deletadas, apenas desvinculadas (grupo_id se torna null).

---

### 📂 Categorias

#### Listar Categorias
```http
GET /categorias
Authorization: Bearer {token}

# Filtrar por tipo (opcional)
GET /categorias?tipo=despesa
GET /categorias?tipo=receita

# Filtrar por grupo (opcional)
GET /categorias?grupo_id=1
```

**Retorna categorias com informações do grupo associado.**

#### Buscar Categoria
```http
GET /categorias/:id
Authorization: Bearer {token}
```

#### Criar Categoria
```http
POST /categorias
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Alimentação",
  "tipo": "despesa",
  "grupo_id": 2,
  "cor": "#FF5722",
  "icone": "restaurant"
}
```

**Tipos:** `receita`, `despesa`

**Campos:**
- `grupo_id` (opcional) - ID do grupo de categoria (Fixa, Variável, etc.)

#### Atualizar Categoria
```http
PUT /categorias/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Restaurantes",
  "grupo_id": 2,
  "cor": "#F44336"
}
```

#### Deletar Categoria
```http
DELETE /categorias/:id
Authorization: Bearer {token}
```

---

### 💳 Cartões de Crédito

#### Listar Cartões
```http
GET /cartoes
Authorization: Bearer {token}
```

**Retorna:**
```json
{
  "estatisticas": {
    "total_cartoes": 3,
    "cartoes_ativos": 2,
    "limite_total": 15000.00,
    "limite_utilizado": 3500.00,
    "limite_disponivel": 11500.00
  },
  "cartoes": [
    {
      "id": 1,
      "nome": "Nubank",
      "limite": 5000.00,
      "limite_utilizado": 1200.00,
      "dia_fechamento": 15,
      "dia_vencimento": 25,
      "bandeira": "Mastercard",
      "ultimos_digitos": "1234",
      "cor": "#820AD1",
      "ativo": true,
      ...
    }
  ]
}
```

#### Buscar Cartão
```http
GET /cartoes/:id
Authorization: Bearer {token}
```

#### Criar Cartão
```http
POST /cartoes
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Nubank",
  "limite": 5000.00,
  "dia_fechamento": 15,
  "dia_vencimento": 25,
  "bandeira": "Mastercard",
  "ultimos_digitos": "1234",
  "cor": "#8B10AE",
  "ativo": true
}
```

#### Atualizar Cartão
```http
PUT /cartoes/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "limite": 7000.00,
  "dia_vencimento": 28
}
```

#### Deletar Cartão
```http
DELETE /cartoes/:id
Authorization: Bearer {token}
```

---

### 📄 Faturas

#### Listar Faturas
```http
GET /faturas
Authorization: Bearer {token}

# Filtros opcionais
GET /faturas?cartao_id=1
GET /faturas?status=aberta
GET /faturas?ano=2025
GET /faturas?mes=10
GET /faturas?cartao_id=1&status=paga&ano=2025
```

**Status:** `aberta`, `fechada`, `paga`, `atrasada`

**Resposta inclui:**
- Informações do cartão vinculado
- Conta padrão para débito (se definida)
- Movimento de pagamento vinculado
- Total de movimentos (compras)

#### Buscar Fatura
```http
GET /faturas/:id
Authorization: Bearer {token}
```

**Retorna:**
- Dados completos da fatura
- Cartão vinculado
- Conta padrão
- Movimento de pagamento
- Lista de todos os movimentos (compras) da fatura

#### Criar Fatura
```http
POST /faturas
Authorization: Bearer {token}
Content-Type: application/json

{
  "mes_referencia": 10,
  "ano_referencia": 2025,
  "data_fechamento": "2025-10-15",
  "data_vencimento": "2025-10-25",
  "cartao_id": 1,
  "conta_id": 2  // opcional - conta padrão para débito
}
```

#### Atualizar Fatura
```http
PUT /faturas/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "fechada",
  "conta_id": 2  // opcional - atualizar conta padrão
}
```

**Observações:**
- Ao alterar `conta_id`, o movimento de pagamento vinculado também é atualizado
- Status pode ser: `aberta`, `fechada`, `paga`, `atrasada`

#### Pagar Fatura (NOVA ROTA) ⭐
```http
POST /faturas/:id/pagar
Authorization: Bearer {token}
Content-Type: application/json

{
  "valor_pago": 1500.00,
  "data_pagamento": "2025-10-25",
  "conta_id": 2,  // opcional - se não informado, usa a conta padrão da fatura
  "categoria_id": 5  // opcional - categoria do movimento de pagamento
}
```

**Funcionalidades:**
- ✅ Permite pagamento parcial ou total da fatura
- ✅ Valida se o valor não excede o valor restante
- ✅ Atualiza automaticamente o `valor_pago` da fatura
- ✅ Muda status para `paga` quando pagamento completo
- ✅ Cria ou atualiza movimento de pagamento automaticamente
- ✅ Permite alterar data de pagamento
- ✅ Permite alterar conta de débito
- ✅ Atualiza saldo da conta automaticamente
- ✅ Define `origem: 'fatura'` no movimento

**Resposta:**
```json
{
  "message": "Pagamento parcial registrado com sucesso",
  "fatura": { /* dados da fatura atualizada */ },
  "pagamento": {
    "valor_pago": 1500.00,
    "valor_restante": 500.00
  }
}
```

**Exemplo de Pagamentos Múltiplos:**
```http
# Primeiro pagamento
POST /faturas/1/pagar
{
  "valor_pago": 1000.00,
  "data_pagamento": "2025-10-10",
  "conta_id": 2
}

# Segundo pagamento
POST /faturas/1/pagar
{
  "valor_pago": 500.00,
  "data_pagamento": "2025-10-15",
  "conta_id": 3  // pode usar conta diferente
}
```

#### Deletar Fatura
```http
DELETE /faturas/:id
Authorization: Bearer {token}
```

**Atenções:**
- ⚠️ Deleta todos os movimentos (compras) vinculados à fatura
- ⚠️ Deleta o movimento de pagamento
- ⚠️ Atualiza o limite utilizado do cartão
- ⚠️ Operação irreversível

---

### 📋 Movimentos da Fatura

#### Buscar Movimentos da Fatura
```http
GET /faturas/:id/movimentos
Authorization: Bearer {token}
```

**Descrição:** Retorna todos os movimentos (compras) vinculados à fatura especificada.

**Resposta:**
```json
[
  {
    "id": 15,
    "descricao": "Supermercado",
    "valor": 350.00,
    "tipo": "despesa",
    "data_competencia": "2025-10-20",
    "data_pagamento": null,
    "pago": false,
    "origem": "cartao",
    "parcelado": false,
    "numero_parcela": null,
    "total_parcelas": null,
    "observacao": null,
    "categoria": {
      "id": 2,
      "nome": "Alimentação",
      "cor": "#FF5722",
      "icone": "restaurant"
    },
    "conta": null,
    "fatura_id": 1,
    "user_id": 1
  }
]
```

**Recursos:**
- ✅ Verifica se a fatura pertence ao usuário autenticado
- ✅ Inclui dados de categoria e conta associados
- ✅ Ordenado por data de competência (ascendente)

---

#### Incluir Movimento na Fatura
```http
POST /faturas/:id/movimentos
Authorization: Bearer {token}
Content-Type: application/json

{
  "descricao": "Restaurante",
  "valor": 120.00,
  "data_competencia": "2025-10-21",
  "categoria_id": 2,
  "observacao": "Jantar com cliente",
  "parcelado": false
}
```

**Campos Obrigatórios:**
- `descricao` - Descrição da compra
- `valor` - Valor da compra (deve ser maior que zero)
- `data_competencia` - Data da competência/compra

**Campos Opcionais:**
- `categoria_id` - ID da categoria
- `observacao` - Observações adicionais
- `parcelado` - Se é parcelado (padrão: false)
- `numero_parcela` - Número da parcela atual
- `total_parcelas` - Total de parcelas

**Validações:**
- ❌ Fatura não pode estar fechada ou paga
- ❌ Valor deve ser maior que zero
- ✅ Fatura deve pertencer ao usuário autenticado

**Efeitos Automáticos:**
- ✅ Atualiza `valor_total` da fatura
- ✅ Atualiza `limite_utilizado` do cartão
- ✅ Define automaticamente: `tipo: "despesa"`, `origem: "cartao"`, `pago: false`

**Resposta:**
```json
{
  "id": 16,
  "descricao": "Restaurante",
  "valor": 120.00,
  "tipo": "despesa",
  "data_competencia": "2025-10-21",
  "pago": false,
  "origem": "cartao",
  "categoria": {
    "id": 2,
    "nome": "Alimentação",
    "cor": "#FF5722",
    "icone": "restaurant"
  },
  "fatura_id": 1,
  ...
}
```

---

#### Atualizar Movimento da Fatura
```http
PUT /faturas/:id/movimentos/:movimento_id
Authorization: Bearer {token}
Content-Type: application/json

{
  "descricao": "Restaurante Premium",
  "valor": 150.00,
  "data_competencia": "2025-10-21",
  "categoria_id": 3,
  "observacao": "Jantar executivo"
}
```

**Campos Atualizáveis:**
- `descricao` - Nova descrição
- `valor` - Novo valor (recalcula total da fatura e limite do cartão)
- `data_competencia` - Nova data
- `categoria_id` - Nova categoria
- `observacao` - Nova observação

**Validações:**
- ❌ Fatura não pode estar fechada ou paga
- ❌ Movimento deve pertencer à fatura especificada
- ❌ Valor deve ser maior que zero (se informado)
- ✅ Fatura deve pertencer ao usuário autenticado

**Efeitos Automáticos (quando valor é alterado):**
- ✅ Recalcula `valor_total` da fatura (aplica a diferença)
- ✅ Recalcula `limite_utilizado` do cartão (aplica a diferença)

**Exemplo de Atualização de Valor:**
```
Valor antigo: 120.00
Valor novo: 150.00
Diferença: +30.00

→ valor_total da fatura aumenta em 30.00
→ limite_utilizado do cartão aumenta em 30.00
```

**Resposta:**
```json
{
  "id": 16,
  "descricao": "Restaurante Premium",
  "valor": 150.00,
  "tipo": "despesa",
  "data_competencia": "2025-10-21",
  "categoria": {
    "id": 3,
    "nome": "Restaurante",
    "cor": "#E91E63",
    "icone": "local_dining"
  },
  "observacao": "Jantar executivo",
  ...
}
```

---

### 💸 Movimentos

#### Listar Movimentos
```http
GET /movimentos
Authorization: Bearer {token}

# Filtros opcionais
GET /movimentos?tipo=despesa
GET /movimentos?pago=true
GET /movimentos?data_inicio=2025-10-01&data_fim=2025-10-31
GET /movimentos?conta_id=1
GET /movimentos?categoria_id=2
GET /movimentos?categorias=1,2,3
GET /movimentos?tipo=receita&pago=false
GET /movimentos?categorias=1,2&data_inicio=2025-10-01
GET /movimentos?incluir_cartao=true  # Incluir movimentos de cartão de crédito
```

**Tipos:** `receita`, `despesa`, `transferencia`

**Filtros disponíveis:**
- `tipo` - Filtrar por tipo de movimento
- `pago` - Filtrar por status de pagamento (true/false)
- `data_inicio` - Data inicial do período
- `data_fim` - Data final do período
- `conta_id` - Filtrar por conta específica
- `categoria_id` - Filtrar por categoria única
- `categorias` - Filtrar por múltiplas categorias (IDs separados por vírgula)
- `incluir_cartao` - Incluir movimentos de cartão de crédito (true/false, padrão: false)

#### Listar Movimentos com Saldo Diário
```http
GET /movimentos/com-saldo
Authorization: Bearer {token}

# Exemplos
GET /movimentos/com-saldo?conta_id=1
GET /movimentos/com-saldo?conta_id=1&data_inicio=2025-10-01&data_fim=2025-10-31
GET /movimentos/com-saldo?conta_id=1&categorias=1,2,3
GET /movimentos/com-saldo?conta_id=1&incluir_cartao=true  # Incluir movimentos de cartão
```

**Nota:** Por padrão, movimentos de cartão de crédito **não são incluídos** na listagem. Para incluí-los, adicione `incluir_cartao=true`.

**Retorna:**
```json
{
  "saldo_inicial": 1000.00,
  "saldo_final_real": 1500.00,
  "saldo_final_previsto": 1800.00,
  "periodo": {
    "data_inicio": "2025-10-01",
    "data_fim": "2025-10-31"
  },
  "conta_id": 1,
  "dias": [
    {
      "data": "2025-10-26",
      "movimentos": [...],
      "saldo_inicial_dia": 1450.00,
      "saldo_real": 1500.00,
      "saldo_previsto": 1800.00,
      "receitas_pagas": 50.00,
      "despesas_pagas": 0.00,
      "receitas_previstas": 300.00,
      "despesas_previstas": 0.00
    },
    {
      "data": "2025-10-25",
      "movimentos": [...],
      "saldo_inicial_dia": 1350.00,
      "saldo_real": 1450.00,
      "saldo_previsto": 1450.00,
      "receitas_pagas": 100.00,
      "despesas_pagas": 0.00,
      "receitas_previstas": 0.00,
      "despesas_previstas": 0.00
    }
  ]
}
```

**Campos calculados por dia:**
- `saldo_inicial_dia` - Saldo no início do dia
- `saldo_real` - Saldo considerando apenas movimentos pagos
- `saldo_previsto` - Saldo considerando todos os movimentos (pagos + previstos)
- `receitas_pagas` - Total de receitas pagas no dia
- `despesas_pagas` - Total de despesas pagas no dia
- `receitas_previstas` - Total de receitas previstas no dia
- `despesas_previstas` - Total de despesas previstas no dia

#### Buscar Movimento
```http
GET /movimentos/:id
Authorization: Bearer {token}
```

#### Criar Movimento
```http
POST /movimentos
Authorization: Bearer {token}
Content-Type: application/json

{
  "descricao": "Supermercado",
  "valor": 150.50,
  "tipo": "despesa",
  "data_competencia": "2025-10-26",
  "observacao": "Compras do mês",
  "pago": true,
  "recorrente": false,
  "parcelado": false,
  "conta_id": 1,
  "categoria_id": 2
}
```

**Campos:**
- `data_competencia` (obrigatório) - Data de competência/vencimento para DRE (regime de competência)
- `data_pagamento` (opcional) - Data em que foi efetivamente pago. Se não informada:
  - Para movimentos de **cartão de crédito** (com `cartao_id` ou `fatura_id`): usa a **data de vencimento da fatura**
  - Para movimentos de **conta** com `pago=true`: usa a **data atual**
- Ao marcar `pago=false`, o campo `data_pagamento` é automaticamente limpo
- `cartao_id` (opcional) - ID do cartão de crédito. Quando fornecido, a fatura é criada/atualizada automaticamente e o limite utilizado é ajustado

**Movimento de Cartão de Crédito (gerenciamento automático de fatura):**
```json
{
  "descricao": "Compra Amazon",
  "valor": 350.00,
  "tipo": "despesa",
  "data_competencia": "2025-10-26",
  "pago": false,
  "cartao_id": 1,
  "categoria_id": 2
}
```

**O que acontece automaticamente:**
- ✅ Fatura é criada (se não existir) para o mês de referência correto baseado no dia de fechamento
- ✅ Valor é adicionado ao `valor_total` da fatura
- ✅ `limite_utilizado` do cartão é atualizado
- ✅ Movimento é vinculado à fatura automaticamente
- ✅ `data_pagamento` é preenchida com a **data de vencimento da fatura**

**Movimento Parcelado:**
```json
{
  "descricao": "TV Samsung",
  "valor": 250.00,
  "tipo": "despesa",
  "data_competencia": "2025-10-26",
  "pago": false,
  "parcelado": true,
  "numero_parcela": 1,
  "total_parcelas": 12,
  "fatura_id": 1,
  "categoria_id": 3
}
```

#### Atualizar Movimento
```http
PUT /movimentos/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "descricao": "Supermercado Atualizado",
  "valor": 180.00,
  "pago": true
}
```

#### Marcar como Pago/Não Pago
```http
PATCH /movimentos/:id/toggle-pago
Authorization: Bearer {token}
```

#### Deletar Movimento
```http
DELETE /movimentos/:id
Authorization: Bearer {token}
```

---

## � Relatórios

### DRE (Demonstrativo de Resultados do Exercício)

#### Gerar DRE
```http
GET /dre
Authorization: Bearer {token}
```

**Query Parameters:**
- `data_inicio` (obrigatório) - Data inicial do período (formato: YYYY-MM-DD)
- `data_fim` (obrigatório) - Data final do período (formato: YYYY-MM-DD)
- `modo` (opcional) - Modo de apuração: `competencia` (padrão) ou `caixa`
  - `competencia`: Considera a data de competência de todos os movimentos
  - `caixa`: Considera apenas movimentos pagos pela data de pagamento
- `user_ids` (opcional) - IDs de usuários separados por vírgula para DRE consolidado (ex: "1,2,3")

**Exemplos:**

DRE individual por competência (padrão):
```http
GET /dre?data_inicio=2025-01-01&data_fim=2025-12-31
```

DRE por regime de caixa:
```http
GET /dre?data_inicio=2025-01-01&data_fim=2025-12-31&modo=caixa
```

DRE consolidado (família/empresa):
```http
GET /dre?data_inicio=2025-01-01&data_fim=2025-12-31&user_ids=1,2,3
```

**Resposta:**
```json
{
  "periodo": {
    "data_inicio": "2025-01-01",
    "data_fim": "2025-12-31",
    "modo": "competencia"
  },
  "usuarios": [1],
  "consolidado": false,
  "receitas": {
    "total": 15000.00,
    "grupos": [
      {
        "id": 1,
        "nome": "Rendimentos",
        "cor": "#4CAF50",
        "icone": "💰",
        "total": 15000.00,
        "categorias": [
          {
            "id": 1,
            "nome": "Salário",
            "cor": "#4CAF50",
            "icone": "💵",
            "total": 15000.00
          }
        ]
      }
    ],
    "categorias": [
      {
        "id": 1,
        "nome": "Salário",
        "grupo": "Rendimentos",
        "cor": "#4CAF50",
        "icone": "💵",
        "total": 15000.00
      }
    ]
  },
  "despesas": {
    "total": 10000.00,
    "grupos": [
      {
        "id": 2,
        "nome": "Alimentação",
        "cor": "#FF5722",
        "icone": "🍔",
        "total": 3000.00,
        "categorias": [
          {
            "id": 5,
            "nome": "Supermercado",
            "cor": "#FF5722",
            "icone": "🛒",
            "total": 2000.00
          },
          {
            "id": 6,
            "nome": "Restaurantes",
            "cor": "#FF5722",
            "icone": "🍽️",
            "total": 1000.00
          }
        ]
      }
    ],
    "categorias": [
      {
        "id": 5,
        "nome": "Supermercado",
        "grupo": "Alimentação",
        "cor": "#FF5722",
        "icone": "🛒",
        "total": 2000.00
      }
    ]
  },
  "resultado_liquido": 5000.00,
  "detalhamento": {
    "total_movimentos": 150,
    "movimentos_sem_categoria": 5
  }
}
```

**Funcionalidades:**
- ✅ DRE individual ou consolidado (múltiplos usuários)
- ✅ Regime de competência ou regime de caixa
- ✅ Agrupamento por grupos de categorias e categorias
- ✅ Totalizadores de receitas, despesas e resultado líquido
- ✅ Ordenação automática por valores (maior para menor)
- ✅ Identificação de movimentos sem categoria

**Segurança:**
- ⚠️ Ao usar `user_ids` para consolidação, o usuário logado DEVE estar incluído na lista
- ⚠️ Não é possível visualizar DRE de outros usuários sem incluir o seu próprio ID

---

## �🔄 Recursos Especiais

### Atualização Automática de Saldo
- Ao criar/atualizar/deletar um movimento **pago**, o saldo da conta é atualizado automaticamente
- Receitas aumentam o saldo
- Despesas diminuem o saldo

### Relacionamentos
- Movimentos podem estar vinculados a **Contas**, **Categorias** e **Faturas**
- Faturas estão vinculadas a **Cartões de Crédito**
- Todas as entidades estão vinculadas ao **Usuário**

---

## 📊 Códigos de Status

- `200` - OK
- `201` - Criado com sucesso
- `204` - Deletado com sucesso (sem conteúdo)
- `400` - Dados inválidos
- `401` - Não autenticado
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor
