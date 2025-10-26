# webwthr

Projeto web com integração de Agente AI para WhatsApp.

## Backend for WhatsApp Agent

Há um pequeno servidor em `server/` que armazena chaves da API do WhatsApp (criptografadas) e recebe webhooks.

Quick start:

```bash
cd server
npm install
cp .env.example .env
# editar .env com SUPABASE_SERVICE_ROLE_KEY e ENCRYPTION_KEY_BASE64
npm run dev
```

## Frontend

Para executar o frontend em desenvolvimento:

```bash
npm install
npm run dev
```

Endpoints principais:
- `POST /api/keys` — Recebe JSON { apiKey } e grava a chave criptografada (requer cabeçalho `x-user-id` para demo).
- `POST /api/test-send` — Tenta enviar uma mensagem de teste usando a chave armazenada.
- `POST /webhook/whatsapp` — Recebe webhooks do WhatsApp Business API.

O frontend foi ajustado para enviar a chave ao endpoint `/api/keys` em vez de gravar diretamente no Supabase.
