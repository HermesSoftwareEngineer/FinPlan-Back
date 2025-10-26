# Exemplos de Requisições - FinPlan API

## Health Check

```bash
GET http://localhost:3000/health
```

## Cadastro de Usuário

```bash
POST http://localhost:3000/auth/register
Content-Type: application/json

{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

## Login

```bash
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "joao@exemplo.com",
  "password": "senha123"
}
```

## Acessar Perfil (Rota Protegida)

```bash
GET http://localhost:3000/user/profile
Authorization: Bearer SEU_TOKEN_AQUI
```

---

## Testando com cURL (PowerShell)

### Health Check
```powershell
curl http://localhost:3000/health
```

### Cadastro
```powershell
curl -X POST http://localhost:3000/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"name\":\"João Silva\",\"email\":\"joao@exemplo.com\",\"password\":\"senha123\"}'
```

### Login
```powershell
curl -X POST http://localhost:3000/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"joao@exemplo.com\",\"password\":\"senha123\"}'
```

### Perfil
```powershell
curl -X GET http://localhost:3000/user/profile `
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

## Testando com PowerShell (Invoke-RestMethod)

### Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
```

### Cadastro
```powershell
$body = @{
    name = "João Silva"
    email = "joao@exemplo.com"
    password = "senha123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/auth/register" -Method Post -Body $body -ContentType "application/json"
```

### Login
```powershell
$body = @{
    email = "joao@exemplo.com"
    password = "senha123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method Post -Body $body -ContentType "application/json"
$token = $response.token
```

### Perfil
```powershell
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:3000/user/profile" -Method Get -Headers $headers
```
