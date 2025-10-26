# API Dashboard - FinPlan

## Endpoint: GET /dashboard

Retorna dados consolidados para exibição no dashboard principal da aplicação.

### Autenticação
Requer token JWT no header:
```
Authorization: Bearer {token}
```

### Query Parameters (Opcionais)

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| data_inicio | string | Data inicial para filtro do gráfico (formato: YYYY-MM-DD) |
| data_fim | string | Data final para filtro do gráfico (formato: YYYY-MM-DD) |

**Nota:** Se `data_inicio` e `data_fim` não forem informados, o gráfico exibirá os dados do mês atual.

### Exemplo de Requisição

```bash
# Dashboard com dados do mês atual
GET /dashboard

# Dashboard com filtro personalizado no gráfico
GET /dashboard?data_inicio=2024-01-01&data_fim=2024-12-31
```

### Resposta de Sucesso

**Status Code:** 200 OK

```json
{
  "saldo_total": 15750.50,
  "receitas_mes_atual": 8500.00,
  "despesas_mes_atual": 5320.75,
  "economia_mes_atual": 3179.25,
  "periodo_grafico": {
    "data_inicio": "2024-10-01",
    "data_fim": "2024-10-31"
  },
  "gastos_por_categoria": [
    {
      "categoria_id": 5,
      "categoria_nome": "Alimentação",
      "categoria_cor": "#FF6B6B",
      "categoria_icone": "🍔",
      "total": 1850.00
    },
    {
      "categoria_id": 8,
      "categoria_nome": "Transporte",
      "categoria_cor": "#4ECDC4",
      "categoria_icone": "🚗",
      "total": 980.50
    },
    {
      "categoria_id": 12,
      "categoria_nome": "Lazer",
      "categoria_cor": "#95E1D3",
      "categoria_icone": "🎮",
      "total": 650.00
    }
  ]
}
```

### Campos de Resposta

| Campo | Tipo | Descrição |
|-------|------|-----------|
| saldo_total | number | Soma do saldo atual de todas as contas ativas |
| receitas_mes_atual | number | Total de receitas pagas no mês atual |
| despesas_mes_atual | number | Total de despesas pagas no mês atual |
| economia_mes_atual | number | Diferença entre receitas e despesas do mês (pode ser negativo) |
| periodo_grafico | object | Período usado para gerar o gráfico |
| periodo_grafico.data_inicio | string | Data inicial do período |
| periodo_grafico.data_fim | string | Data final do período |
| gastos_por_categoria | array | Lista de categorias com seus totais de gastos |
| gastos_por_categoria[].categoria_id | number | ID da categoria |
| gastos_por_categoria[].categoria_nome | string | Nome da categoria |
| gastos_por_categoria[].categoria_cor | string | Cor da categoria (hexadecimal) |
| gastos_por_categoria[].categoria_icone | string | Ícone da categoria (emoji ou string) |
| gastos_por_categoria[].total | number | Total gasto na categoria |

### Observações Importantes

1. **Saldo Total:** Considera apenas contas ativas (`ativa = true`)

2. **Receitas e Despesas:** Considera apenas movimentos:
   - Com `pago = true`
   - Dentro do período do mês atual
   - Do tipo correspondente (`receita` ou `despesa`)

3. **Economia:** Pode ser negativa se as despesas forem maiores que as receitas

4. **Gráfico de Gastos:**
   - Considera apenas despesas pagas
   - Agrupa por categoria
   - Ordenado por total (decrescente)
   - Apenas movimentos com categoria associada
   - Permite filtro por período personalizado via query params

### Resposta de Erro

**Status Code:** 500 Internal Server Error

```json
{
  "message": "Erro ao buscar dados do dashboard",
  "error": "Mensagem de erro detalhada"
}
```

### Exemplo de Uso (JavaScript)

```javascript
// Buscar dados do dashboard
const response = await fetch('/dashboard', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Buscar com filtro personalizado
const responseCustom = await fetch('/dashboard?data_inicio=2024-01-01&data_fim=2024-12-31', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const dataCustom = await responseCustom.json();
```

### Exemplo de Uso (Python)

```python
import requests

# Headers com autenticação
headers = {
    'Authorization': f'Bearer {token}'
}

# Dashboard padrão (mês atual)
response = requests.get('http://localhost:3000/dashboard', headers=headers)
data = response.json()

# Dashboard com filtro
params = {
    'data_inicio': '2024-01-01',
    'data_fim': '2024-12-31'
}
response = requests.get('http://localhost:3000/dashboard', headers=headers, params=params)
data = response.json()
```
