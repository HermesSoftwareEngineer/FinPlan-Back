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
  "cor": "#FF5722",
  "icone": "restaurant"
}
```

**Tipos:** `receita`, `despesa`

#### Atualizar Categoria
```http
PUT /categorias/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Restaurantes",
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
GET /faturas?cartao_id=1&status=paga
```

**Status:** `aberta`, `fechada`, `paga`, `atrasada`

#### Buscar Fatura
```http
GET /faturas/:id
Authorization: Bearer {token}
```

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
  "cartao_id": 1
}
```

#### Atualizar Fatura
```http
PUT /faturas/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "paga",
  "valor_pago": 1500.00
}
```

#### Deletar Fatura
```http
DELETE /faturas/:id
Authorization: Bearer {token}
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
GET /movimentos?tipo=receita&pago=false
```

**Tipos:** `receita`, `despesa`, `transferencia`

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
  "data": "2025-10-26",
  "observacao": "Compras do mês",
  "pago": true,
  "recorrente": false,
  "parcelado": false,
  "conta_id": 1,
  "categoria_id": 2
}
```

**Movimento Parcelado:**
```json
{
  "descricao": "TV Samsung",
  "valor": 250.00,
  "tipo": "despesa",
  "data": "2025-10-26",
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

## 🔄 Recursos Especiais

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
