# Sistema de Gerenciamento de Listas de Compras 🛒

Sistema distribuído de microsserviços para gerenciamento de listas de compras, desenvolvido para a disciplina de Laboratório de Desenvolvimento de Aplicações Móveis e Distribuídas.

## 📦 Instalação

```bash
# Instalar dependências
npm run install:all

# Executar todos os serviços
npm start

# Ou executar individualmente
npm run start:user
npm run start:item
npm run start:list
npm run start:gateway
## Mensageria (Checkout assíncrono)

1. Instalar dependências (na raiz):

```powershell
npm install
cd services/list-service
npm install
cd ..\..
```

2. Iniciar os consumers (terminal A):

```powershell
npm run start:consumers
```

3. Iniciar o `list-service` (terminal B):

```powershell
npm run start:list
```

4. Gerar um token JWT de teste e armazená-lo em `$token` (terminal C):

```powershell
$token = (npm --silent --prefix services/list-service run gen:token)
Write-Host "Token: $token"
```

5. Criar a lista e fazer o checkout (usando `$token` já definido):

```powershell
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$body = @{ name = "Lista Demo"; description = "Teste de checkout" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri 'http://localhost:3002/lists' -Method Post -Headers $headers -Body $body
$listId = $response.id
Invoke-RestMethod -Uri "http://localhost:3002/lists/$listId/checkout" -Method Post -Headers @{ Authorization = "Bearer $token" }
```
