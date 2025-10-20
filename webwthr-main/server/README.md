# Server (backend) for WhatsApp Agent

This lightweight Express server provides endpoints to securely store WhatsApp Business API keys (encrypted) and receive webhook events.

Environment (see `.env.example`):
- PORT
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (must be the project's service role key)
- ENCRYPTION_KEY_BASE64 (32 bytes base64 key used for AES-256-GCM)
- WHATSAPP_API_BASE (WhatsApp Business API endpoint template)
- WHATSAPP_VERIFY_TOKEN (webhook verify token)

Install and run (from repo root):

```bash
cd server
npm install
npm run dev
```

Notes:
- The server currently expects an `x-user-id` header for demo purposes; integrate with Supabase session validation in production.
- The server encrypts keys client-provided and upserts into `whatsapp_keys` table via the Supabase service role. Ensure RLS policies prevent client reads.
