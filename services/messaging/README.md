# Mensageria - Consumers (Notification & Analytics)

Este README descreve como rodar os consumers de mensageria e demonstrar o fluxo de *checkout* usando o broker CloudAMQP.

Pré-requisitos
- Node.js >= 16
- A dependência `amqplib` já foi adicionada ao projeto
- Ter a URL AMQP (CloudAMQP) pronta

Arquivo `.env`
- Crie/edite o arquivo `.env` na raiz do repositório com a variável:

```dotenv
RABBITMQ_URL=amqps://SEU_USUARIO:SEU_PASS@seu-host.cloudamqp.com/seu_vhost
```

Observação: NÃO comite o `.env` com credenciais.

Instalação (na raiz do projeto)
```powershell
# Na raiz do projeto
npm install
# (opcional) instalar deps específicas do list-service
cd services/list-service
npm install
cd ../..
```

Iniciar os consumers
- Opção A (um terminal, script `start:consumers`):
```powershell
# Na raiz
npm run start:consumers
```
- Opção B (dois terminais separados — recomendado para debugging):
Terminal A:
```powershell
$env:RABBITMQ_URL='amqps://SEU_USUARIO:SEU_PASS@seu-host.cloudamqp.com/seu_vhost'
node services/messaging/consumer_notification.js
```
Terminal B:
```powershell
$env:RABBITMQ_URL='amqps://SEU_USUARIO:SEU_PASS@seu-host.cloudamqp.com/seu_vhost'
node services/messaging/consumer_analytics.js
```

Iniciar o List Service
```powershell
cd services/list-service
npm start
```

Gerar token JWT de teste
```powershell
cd services/list-service
npm run gen:token
# copie o token gerado
```

Criar uma lista (pegar listId)
```powershell
curl -X POST http://localhost:3002/lists -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d "{\"name\":\"Lista Demo\",\"description\":\"Teste de checkout\"}"
```
Copie o campo `id` do retorno JSON como `<LIST_ID>`.

Executar Checkout (publica evento)
```powershell
curl -X POST http://localhost:3002/lists/<LIST_ID>/checkout -H "Authorization: Bearer <TOKEN>"
```
Resposta esperada: HTTP 202 com `{ "message": "Checkout accepted and published" }`.

O que verificar
- No terminal dos consumers você verá algo como:
  - `Enviando comprovante da lista <LIST_ID> para o usuário <EMAIL>`
  - `Analytics: Lista <LIST_ID> -> total gasto R$ <valor>`
- No CloudAMQP Management (ou RabbitMQ UI), os exchanges/filas serão criados automaticamente: `shopping_events`, `shopping_notifications`, `shopping_analytics`.

Soluções de problemas comuns
- Erro `ECONNREFUSED`: verifique se `RABBITMQ_URL` está correto em `.env`, se o host está ativo, e se o `amqps://` e vhost estão corretos.
- Erro `'concurrently' não é reconhecido`: rode `npm install` na raiz para garantir que `concurrently` esteja instalado.
- Erro `Cannot find module 'express'` ao iniciar `list-service`: execute `cd services/list-service && npm install`.

Boas práticas
- Não coloque credenciais em commits.
- Em produção, mantenha conexões persistentes ao broker e reconexão com retry/backoff.

Se quiser, eu posso:
- Adicionar um script `demo` que automatize gerar token, criar lista e disparar checkout, ou
- Implementar a requisição ao `user-service` para incluir `userEmail` real no payload do evento.

Arquivo criado: `services/messaging/README.md`
