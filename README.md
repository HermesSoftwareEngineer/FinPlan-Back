# FinPlan Backend

Backend do sistema de planejamento financeiro FinPlan, desenvolvido com Node.js, Express, Sequelize e PostgreSQL (Supabase).

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Sequelize** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados (Supabase)
- **JWT** - Autenticação
- **Bcryptjs** - Criptografia de senhas
- **CORS** - Compartilhamento de recursos

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- Conta no Supabase
- PostgreSQL (fornecido pelo Supabase)

## ⚙️ Configuração

1. Clone o repositório
   ```bash
   git clone https://github.com/HermesSoftwareEngineer/FinPlan-Back.git
   cd FinPlan-Back
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env.example` para `.env`
   - Preencha as credenciais do seu banco Supabase
   - Gere uma chave secreta para o JWT

4. Inicie o servidor (as tabelas serão criadas automaticamente):
   ```bash
   npm run dev
   ```

## 🗄️ Configuração do Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Nas configurações do projeto, encontre as credenciais de conexão:
   - Host: `db.xxxxx.supabase.co`
   - Database: `postgres`
   - User: `postgres`
   - Password: sua senha do projeto
   - Port: `5432`

4. Atualize o arquivo `.env` com essas credenciais

## 🏃 Executando o Projeto

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

> **Nota:** O banco de dados será sincronizado automaticamente ao iniciar o servidor usando `sequelize.sync({ alter: true })`.

## 📚 API Endpoints

Para documentação completa de todas as rotas, consulte [ROUTES.md](ROUTES.md)

### Resumo das Rotas

#### Autenticação (Públicas)
- `POST /auth/register` - Cadastro de usuário
- `POST /auth/login` - Login

#### Usuário (Protegidas)
- `GET /user/profile` - Perfil do usuário

#### Contas (Protegidas)
- `GET /contas` - Listar contas
- `GET /contas/:id` - Buscar conta
- `POST /contas` - Criar conta
- `PUT /contas/:id` - Atualizar conta
- `DELETE /contas/:id` - Deletar conta

#### Categorias (Protegidas)
- `GET /categorias` - Listar categorias
- `GET /categorias/:id` - Buscar categoria
- `POST /categorias` - Criar categoria
- `PUT /categorias/:id` - Atualizar categoria
- `DELETE /categorias/:id` - Deletar categoria

#### Cartões de Crédito (Protegidas)
- `GET /cartoes` - Listar cartões
- `GET /cartoes/:id` - Buscar cartão
- `POST /cartoes` - Criar cartão
- `PUT /cartoes/:id` - Atualizar cartão
- `DELETE /cartoes/:id` - Deletar cartão

#### Faturas (Protegidas)
- `GET /faturas` - Listar faturas
- `GET /faturas/:id` - Buscar fatura
- `POST /faturas` - Criar fatura
- `PUT /faturas/:id` - Atualizar fatura
- `DELETE /faturas/:id` - Deletar fatura

#### Movimentos (Protegidas)
- `GET /movimentos` - Listar movimentos
- `GET /movimentos/:id` - Buscar movimento
- `POST /movimentos` - Criar movimento
- `PUT /movimentos/:id` - Atualizar movimento
- `PATCH /movimentos/:id/toggle-pago` - Marcar como pago/não pago
- `DELETE /movimentos/:id` - Deletar movimento

### Health Check
```http
GET /health
```

## 🗂️ Modelos de Dados

### User (Usuário)
- `id` - ID único
- `name` - Nome completo
- `email` - Email (único)
- `password` - Senha criptografada
- `created_at` - Data de criação
- `updated_at` - Data de atualização

### Conta
- `id` - ID único
- `nome` - Nome da conta
- `tipo` - Tipo: corrente, poupanca, investimento, dinheiro
- `saldo_inicial` - Saldo inicial
- `saldo_atual` - Saldo atual (atualizado automaticamente)
- `cor` - Cor em hexadecimal (#RRGGBB)
- `ativa` - Status ativo/inativo
- `user_id` - ID do usuário proprietário

### Categoria
- `id` - ID único
- `nome` - Nome da categoria
- `tipo` - Tipo: receita ou despesa
- `cor` - Cor em hexadecimal
- `icone` - Nome do ícone
- `user_id` - ID do usuário proprietário

### CartaoCredito
- `id` - ID único
- `nome` - Nome do cartão
- `limite` - Limite do cartão
- `dia_fechamento` - Dia do fechamento da fatura (1-31)
- `dia_vencimento` - Dia do vencimento da fatura (1-31)
- `bandeira` - Bandeira (Visa, Mastercard, etc)
- `ultimos_digitos` - Últimos 4 dígitos
- `cor` - Cor em hexadecimal
- `ativo` - Status ativo/inativo
- `user_id` - ID do usuário proprietário

### Fatura
- `id` - ID único
- `mes_referencia` - Mês de referência (1-12)
- `ano_referencia` - Ano de referência
- `data_fechamento` - Data de fechamento
- `data_vencimento` - Data de vencimento
- `valor_total` - Valor total da fatura
- `valor_pago` - Valor já pago
- `status` - Status: aberta, fechada, paga, atrasada
- `cartao_id` - ID do cartão

### Movimento
- `id` - ID único
- `descricao` - Descrição do movimento
- `valor` - Valor do movimento
- `tipo` - Tipo: receita, despesa, transferencia
- `data` - Data do movimento
- `observacao` - Observações adicionais
- `pago` - Status de pagamento
- `recorrente` - Se é recorrente
- `parcelado` - Se é parcelado
- `numero_parcela` - Número da parcela atual
- `total_parcelas` - Total de parcelas
- `user_id` - ID do usuário proprietário
- `conta_id` - ID da conta (opcional)
- `categoria_id` - ID da categoria (opcional)
- `fatura_id` - ID da fatura (opcional)

## 🔗 Relacionamentos

```
User (1) ──→ (N) Contas
User (1) ──→ (N) Categorias
User (1) ──→ (N) CartoesCredito
User (1) ──→ (N) Movimentos

CartaoCredito (1) ──→ (N) Faturas
Fatura (1) ──→ (N) Movimentos

Conta (1) ──→ (N) Movimentos
Categoria (1) ──→ (N) Movimentos
```

## 📁 Estrutura do Projeto

```
FinPlan-Back/
├── src/
│   ├── config/
│   │   └── database.js              # Configuração do Sequelize
│   ├── controllers/
│   │   ├── AuthController.js        # Controller de autenticação
│   │   ├── ContaController.js       # Controller de contas
│   │   ├── CategoriaController.js   # Controller de categorias
│   │   ├── CartaoCreditoController.js # Controller de cartões
│   │   ├── FaturaController.js      # Controller de faturas
│   │   └── MovimentoController.js   # Controller de movimentos
│   ├── middlewares/
│   │   └── auth.js                  # Middleware de autenticação JWT
│   ├── models/
│   │   ├── index.js                 # Sincronização automática do banco
│   │   ├── User.js                  # Model de usuário
│   │   ├── Conta.js                 # Model de conta
│   │   ├── Categoria.js             # Model de categoria
│   │   ├── CartaoCredito.js         # Model de cartão de crédito
│   │   ├── Fatura.js                # Model de fatura
│   │   └── Movimento.js             # Model de movimento
│   ├── routes/
│   │   ├── index.js                 # Centralizador de rotas
│   │   ├── auth.routes.js           # Rotas de autenticação
│   │   ├── user.routes.js           # Rotas de usuário
│   │   ├── conta.routes.js          # Rotas de contas
│   │   ├── categoria.routes.js      # Rotas de categorias
│   │   ├── cartao.routes.js         # Rotas de cartões
│   │   ├── fatura.routes.js         # Rotas de faturas
│   │   └── movimento.routes.js      # Rotas de movimentos
│   ├── app.js                       # Configuração do Express
│   └── server.js                    # Inicialização do servidor
├── .env                             # Variáveis de ambiente
├── .env.example                     # Exemplo de variáveis de ambiente
├── .gitignore                       # Arquivos ignorados pelo Git
├── package.json                     # Dependências do projeto
├── README.md                        # Documentação principal
├── ROUTES.md                        # Documentação completa das rotas
└── API_EXAMPLES.md                  # Exemplos de uso da API
```

## ✨ Funcionalidades

- ✅ Sistema completo de autenticação com JWT
- ✅ CRUD completo de contas bancárias
- ✅ CRUD completo de categorias
- ✅ CRUD completo de cartões de crédito
- ✅ CRUD completo de faturas de cartão
- ✅ CRUD completo de movimentos financeiros
- ✅ Atualização automática de saldo nas contas
- ✅ Suporte a movimentos parcelados
- ✅ Suporte a movimentos recorrentes
- ✅ Filtros avançados em todas as listagens
- ✅ Validações de dados com Sequelize
- ✅ Relacionamentos complexos entre entidades
- ✅ Sincronização automática do banco de dados
- ✅ Proteção de rotas com middleware de autenticação

## 🔐 Segurança

- Senhas criptografadas com bcryptjs (10 rounds)
- Autenticação via JWT com expiração de 7 dias
- Conexão SSL com o banco de dados
- Validação de dados com Sequelize
- Middleware de autenticação em rotas protegidas
- CORS habilitado para controle de origem

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📝 Licença

ISC
