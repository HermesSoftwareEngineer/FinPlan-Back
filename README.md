# FinPlan Backend

Backend do sistema de planejamento financeiro FinPlan, desenvolvido com Node.js, Express, Sequelize e PostgreSQL (Supabase).

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Sequelize** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados (Supabase)
- **JWT** - Autenticação
- **Bcrypt** - Criptografia de senhas

## 📋 Pré-requisitos

- Node.js (versão 14 ou superior)
- Conta no Supabase
- PostgreSQL (fornecido pelo Supabase)

## ⚙️ Configuração

1. Clone o repositório
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

## 📚 Endpoints da API

### Health Check
```http
GET /health
```

### Autenticação

#### Cadastro de Usuário
```http
POST /auth/register
Content-Type: application/json

{
  "name": "Nome do Usuário",
  "email": "usuario@email.com",
  "password": "senha123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

#### Perfil (Rota Protegida)
```http
GET /user/profile
Authorization: Bearer {seu_token_jwt}
```

## 📁 Estrutura do Projeto

```
FinPlan-Back/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   └── AuthController.js
│   ├── middlewares/
│   │   └── auth.js
│   ├── models/
│   │   ├── index.js          # Sincronização automática do banco
│   │   └── User.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   ├── app.js
│   └── server.js
│   └── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 🔐 Segurança

- Senhas são criptografadas com bcrypt
- Autenticação via JWT
- Conexão SSL com o banco de dados
- Validação de dados com Sequelize

## 📝 Licença

ISC
