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

3. Logar em alguma conta

Registrar um usuário:

```powershell
$register = @{ email = 'demo@example.com'; username = 'demo_user'; password = 'Password1!'; firstName = 'Demo'; lastName = 'User' } | ConvertTo-Json
$regResp = Invoke-RestMethod -Uri 'http://localhost:3001/auth/register' -Method Post -ContentType 'application/json' -Body $register
$token = $regResp.token
$userId = $regResp.user.id
Write-Host "User registered: $userId"
```

Ou efetuar login em um usuário já existente:

```powershell
$login = @{ username = 'demo_user'; password = 'Password1!' } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Uri 'http://localhost:3001/auth/login' -Method Post -ContentType 'application/json' -Body $login
$token = $loginResp.token
$userId = $loginResp.user.id
Write-Host "Logged in as: $userId"
```

4.Criar uma lista (token já definido):

```powershell
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$body = @{ name = "Lista Demo"; description = "Lista para demo de checkout" } | ConvertTo-Json
$createResp = Invoke-RestMethod -Uri 'http://localhost:3002/lists' -Method Post -Headers $headers -Body $body
$listId = $createResp.id
Write-Host "Lista criada: $listId (userId no token: $userId)"
```

5.Escolher um item para adicionar:

```powershell
$itemsResp = Invoke-RestMethod -Uri 'http://localhost:3003/items' -Method Get
$firstItemId = $itemsResp.items[0].id
Write-Host "Usando item: $firstItemId"
```

6.Adicionar item à lista:

```powershell
$addBody = @{ itemId = $firstItemId; quantity = 2 } | ConvertTo-Json
$updatedList = Invoke-RestMethod -Uri "http://localhost:3002/lists/$listId/items" -Method Post -Headers $headers -Body $addBody
Write-Host "Item adicionado. Total itens na lista: $($updatedList.items.Count)"
```

7.Fazer o checkout (publica evento assíncrono e retorna 202):

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/lists/$listId/checkout" -Method Post -Headers @{ Authorization = "Bearer $token" }
```
