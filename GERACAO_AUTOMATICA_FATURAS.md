# 💳 Sistema de Geração Automática de Faturas - FinPlan

## 📋 Visão Geral

Quando um cartão de crédito é cadastrado, o sistema **automaticamente gera todas as faturas** do período de **Janeiro/2025 até Dezembro/2030** (72 faturas no total).

---

## 🎯 Funcionalidades Implementadas

### 1. Campo `conta_id` em Cartões de Crédito
Cada cartão pode ter uma **conta padrão** associada, que será usada para débito automático das faturas.

**Modelo:**
```javascript
conta_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'contas',
    key: 'id',
  },
  comment: 'Conta padrão para débito das faturas deste cartão',
}
```

### 2. Geração Automática de Faturas
Ao criar um cartão, o sistema cria **72 faturas** (6 anos × 12 meses):
- ✅ Janeiro/2025 até Dezembro/2030
- ✅ Todas com `valor_total = 0`
- ✅ Todas com `status = 'aberta'`
- ✅ Conta padrão do cartão já associada

---

## 🔄 Fluxo Automático

### Quando um Cartão é Cadastrado:

```javascript
POST /cartoes
{
  "nome": "Nubank",
  "limite": 5000.00,
  "dia_fechamento": 15,
  "dia_vencimento": 25,
  "bandeira": "Mastercard",
  "conta_id": 2  // opcional - conta padrão
}
```

**Sistema automaticamente:**
1. ✅ Cria o cartão
2. ✅ Gera 72 faturas (Jan/2025 a Dez/2030)
3. ✅ Associa `conta_id` do cartão a todas as faturas
4. ✅ Retorna mensagem de confirmação

**Resposta:**
```json
{
  "message": "Cartão criado com sucesso! 72 faturas geradas (Jan/2025 a Dez/2030)",
  "cartao": {
    "id": 1,
    "nome": "Nubank",
    "limite": 5000.00,
    "conta_id": 2,
    ...
  }
}
```

---

## 📊 Estrutura de Faturas Geradas

### Exemplo: Cartão criado em 26/10/2025

```javascript
// Fatura 1
{
  "mes_referencia": 1,
  "ano_referencia": 2025,
  "data_fechamento": "2025-01-15",
  "data_vencimento": "2025-01-25",
  "valor_total": 0.00,
  "valor_pago": 0.00,
  "status": "aberta",
  "cartao_id": 1,
  "conta_id": 2  // Herdado do cartão
}

// Fatura 2
{
  "mes_referencia": 2,
  "ano_referencia": 2025,
  "data_fechamento": "2025-02-15",
  "data_vencimento": "2025-02-25",
  ...
}

// ... até ...

// Fatura 72
{
  "mes_referencia": 12,
  "ano_referencia": 2030,
  "data_fechamento": "2030-12-15",
  "data_vencimento": "2030-12-25",
  ...
}
```

---

## 🔄 Quando uma Compra é Adicionada

```javascript
POST /movimentos
{
  "descricao": "Compra na Amazon",
  "valor": 150.00,
  "data_competencia": "2025-10-20",
  "tipo": "despesa",
  "cartao_id": 1
}
```

**Sistema automaticamente:**
1. ✅ Calcula mês de referência baseado no dia de fechamento
2. ✅ **Busca** a fatura correspondente (que já existe!)
3. ✅ Adiciona valor à fatura
4. ✅ Cria/atualiza movimento de pagamento com `conta_id` do cartão
5. ✅ Atualiza limite utilizado

**Importante:** Como as faturas já existem, o processo é mais rápido - apenas busca e atualiza!

---

## 🔧 Atualização de Conta Padrão

### Alterar Conta Padrão do Cartão

```javascript
PUT /cartoes/1
{
  "conta_id": 3  // Nova conta padrão
}
```

**Sistema automaticamente:**
1. ✅ Atualiza `conta_id` do cartão
2. ✅ **Atualiza todas as faturas futuras** (não pagas) com a nova conta
3. ✅ Faturas passadas ou pagas permanecem inalteradas

**Critério de "Faturas Futuras":**
- Status = `aberta` ou `fechada` (não `paga`)
- Ano de referência > ano atual, OU
- Ano de referência = ano atual E mês de referência >= mês atual

**Exemplo:**
```
Hoje: 26/10/2025
Cartão atualizado com nova conta_id = 3

Faturas atualizadas:
✅ 10/2025 (mês atual)
✅ 11/2025
✅ 12/2025
✅ 01/2026 até 12/2030

Faturas NÃO atualizadas:
❌ 01/2025 a 09/2025 (já passaram)
```

---

## 💡 Casos de Uso

### Caso 1: Cartão Sem Conta Padrão
```javascript
POST /cartoes
{
  "nome": "Inter",
  "limite": 3000.00,
  "dia_fechamento": 10,
  "dia_vencimento": 20
  // sem conta_id
}
```

**Resultado:**
- ✅ 72 faturas criadas com `conta_id = null`
- ✅ Usuário define conta ao pagar cada fatura
- ✅ Ou define conta padrão depois via `PUT /cartoes/1`

### Caso 2: Cartão Com Conta Padrão
```javascript
POST /cartoes
{
  "nome": "C6 Bank",
  "limite": 8000.00,
  "dia_fechamento": 5,
  "dia_vencimento": 15,
  "conta_id": 2
}
```

**Resultado:**
- ✅ 72 faturas criadas com `conta_id = 2`
- ✅ Movimentos de pagamento criados automaticamente com `conta_id = 2`
- ✅ Facilita pagamento automático

### Caso 3: Trocar Conta Padrão no Meio do Ano
```javascript
// Outubro/2025 - Usuário muda conta padrão
PUT /cartoes/1
{
  "conta_id": 5  // Mudou de conta 2 para conta 5
}
```

**Resultado:**
- ✅ Faturas de Out/2025 até Dez/2030 → `conta_id = 5`
- ✅ Faturas de Jan/2025 até Set/2025 → `conta_id = 2` (preservadas)

---

## 🎨 Benefícios

### 1. **Performance**
- ✅ Faturas já existem → busca simples, não precisa criar
- ✅ Menos operações de banco ao adicionar compras
- ✅ Queries mais rápidas

### 2. **Planejamento**
- ✅ Usuário vê todas as faturas futuras
- ✅ Pode planejar gastos com antecedência
- ✅ Visualização de calendário de vencimentos

### 3. **Automação**
- ✅ Conta padrão já definida
- ✅ Menos decisões manuais ao pagar faturas
- ✅ Débito automático facilitado

### 4. **Consistência**
- ✅ Todas as faturas seguem o mesmo padrão
- ✅ Datas calculadas corretamente
- ✅ Integridade de dados garantida

---

## 📋 Endpoints Atualizados

### Criar Cartão
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
  "cor": "#8A05BE",
  "ativo": true,
  "conta_id": 2  // NOVO - opcional
}
```

**Resposta:**
```json
{
  "message": "Cartão criado com sucesso! 72 faturas geradas (Jan/2025 a Dez/2030)",
  "cartao": { /* dados do cartão */ }
}
```

### Atualizar Cartão
```http
PUT /cartoes/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "conta_id": 3  // Altera conta padrão
}
```

**Efeito:** Atualiza cartão + todas as faturas futuras não pagas

---

## ⚠️ Observações Importantes

### 1. Período Fixo (2025-2030)
- Razão: Planejamento de longo prazo
- Após 2030: Sistema pode ser expandido

### 2. Faturas Sem Movimento de Pagamento Inicial
- Movimento de pagamento é criado apenas quando há compras
- Faturas com `valor_total = 0` não têm movimento associado

### 3. Compatibilidade com Cartões Antigos
- Função `gerenciarFaturaCartao` tem fallback
- Se fatura não existir, cria automaticamente
- Garante funcionamento com dados legados

### 4. Sincronização de Conta
- Alterar `conta_id` do cartão atualiza faturas futuras
- Movimentos de pagamento também são atualizados
- Histórico preservado

---

## 🚀 Próximos Passos (Sugestões)

- [ ] Dashboard com timeline de faturas
- [ ] Alertas de vencimento próximo
- [ ] Previsão de gastos por fatura
- [ ] Análise de padrão de consumo
- [ ] Sugestão de melhor dia de compra
- [ ] Gráfico de limite utilizado vs disponível
- [ ] Relatório de faturas por período

---

## 📊 Resumo Técnico

### Tabela: cartoes_credito
- ✅ Novo campo: `conta_id` (FK para contas)

### Tabela: faturas
- ✅ Campo existente: `conta_id` (FK para contas)
- ✅ Herdado do cartão ao criar fatura

### Fluxo de Criação:
1. User cria cartão → CartaoCreditoController.store()
2. Controller chama criarFaturasIniciais()
3. Loop: 2025 a 2030, mês 1 a 12
4. Cria 72 faturas com conta_id do cartão
5. Retorna sucesso com mensagem

### Fluxo de Atualização:
1. User atualiza conta_id do cartão
2. Controller atualiza cartão
3. Busca faturas futuras não pagas
4. Atualiza conta_id em massa
5. Retorna sucesso

### Fallback de Compatibilidade:
1. MovimentoController.gerenciarFaturaCartao()
2. Busca fatura do mês/ano
3. Se não existe → cria com conta_id do cartão
4. Se existe → apenas atualiza valores

---

**Tudo pronto!** 🎉

O sistema agora gera automaticamente 72 faturas ao cadastrar um cartão, usando a conta padrão definida. Isso torna o sistema mais eficiente e facilita o planejamento financeiro de longo prazo!
