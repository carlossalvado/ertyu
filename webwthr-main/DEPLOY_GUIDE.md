# 🚀 Guia Completo de Deploy - WebWthr no Railway

## 📋 O que foi preparado

✅ **Dockerfile** - Configurado para Railway com Chromium e Puppeteer
✅ **railway.json** - Configuração otimizada para deploy
✅ **Scripts de produção** - Comando `start:production` adicionado
✅ **Backend preparado** - WAHA_API_BASE configurável via env
✅ **Dependências** - Todas instaladas e build funcionando
✅ **WAHA Setup** - Instruções completas para AWS EC2 Free Tier

## 🎯 Plano de Deploy - FASE 1: Railway (30 dias grátis)

### 1. Preparar Repositório Git
```bash
cd webwthr-main
git init
git add .
git commit -m "feat: prepare for Railway deployment"
# Criar repo no GitHub e fazer push
```

### 2. Deploy no Railway
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login e deploy
railway login
railway init
railway add --name webwthr-db  # Para PostgreSQL
railway up
```

### 3. Configurar Environment Variables no Railway
No painel do Railway, adicionar estas variáveis:

```bash
# Supabase (já existentes)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Novas variáveis
PORT=4000
NODE_ENV=production
ENCRYPTION_KEY_BASE64=your-encryption-key-base64
GOOGLE_AI_API_KEY=your-gemini-api-key
BASE_URL=https://your-railway-app.railway.app

# WAHA (configurar depois da FASE 2)
WAHA_API_BASE=http://your-ec2-ip:3001
```

## 🏗️ FASE 2: WAHA na AWS EC2 (Grátis por 1 ano)

### Opção A: Deploy Automático (Recomendado)
```bash
# Na sua instância EC2, executar:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl start docker

# Instalar docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Criar docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  waha:
    image: devlikeapro/waha:latest
    ports:
      - "3001:3000"
    environment:
      - WAHA_DASHBOARD_USERNAME=admin
      - WAHA_DASHBOARD_PASSWORD=your-secure-password
    volumes:
      - ./waha-data:/app/.waha
    restart: unless-stopped
EOF

# Executar WAHA
docker-compose up -d
```

### Opção B: Manual (se preferir)
Seguir o guia completo em `WAHA_SETUP.md`

## 🔧 FASE 3: Configuração Final

### 1. Atualizar Railway com WAHA URL
```bash
# No painel Railway, adicionar:
WAHA_API_BASE=http://your-ec2-public-ip:3001
```

### 2. Testar Conexões
```bash
# Testar se Railway está funcionando
curl https://your-railway-app.railway.app

# Testar se WAHA está funcionando
curl http://your-ec2-ip:3001/ping
```

### 3. Configurar WhatsApp
1. Acesse `https://your-railway-app.railway.app`
2. Vá para Configurações > WhatsApp
3. Clique em "Conectar WhatsApp"
4. Escaneie o QR code no WAHA Dashboard: `http://your-ec2-ip:3001`

## 📊 Custos Esperados

| Serviço | Período | Custo |
|---------|---------|-------|
| Railway | 30 dias | $0 |
| Railway | Após 30 dias | $5/mês |
| AWS EC2 | 12 meses | $0 |
| AWS EC2 | Após 12 meses | ~$8/mês |
| **Total nos primeiros 12 meses** | | **$0** |

## 🚨 Pontos de Atenção

### Segurança
- ✅ Mudar senha padrão do WAHA Dashboard
- ✅ Configurar Security Groups na AWS (apenas portas necessárias)
- ✅ Usar HTTPS (Railway já fornece automaticamente)

### Monitoramento
- ✅ Railway fornece logs em tempo real
- ✅ Configurar alertas de uso na AWS
- ✅ Monitorar custos mensalmente

### Backup
- ✅ Railway faz backup automático do database
- ✅ Fazer backup dos dados WAHA regularmente
- ✅ Backup do código no GitHub

## 🔄 Próximos Passos

1. **Imediatamente**: Fazer deploy no Railway
2. **Esta semana**: Configurar WAHA na AWS
3. **Próxima semana**: Testar integração completa
4. **Mensalmente**: Monitorar custos e uso

## 🆘 Troubleshooting

### Railway não faz build
```bash
# Verificar logs
railway logs

# Verificar se Dockerfile está correto
docker build -t test .
```

### WAHA não conecta
```bash
# Verificar se está rodando
docker-compose ps

# Verificar logs
docker-compose logs waha

# Testar conectividade
curl http://localhost:3001/ping
```

### WhatsApp não conecta
- Verificar se WAHA_API_BASE está correto no Railway
- Verificar se Security Group permite porta 3001
- Verificar logs do backend no Railway

## 📞 Suporte

- Railway Docs: https://docs.railway.app/
- WAHA Docs: https://waha.devlike.pro/
- AWS Free Tier: https://aws.amazon.com/free/

---

**🎉 Pronto! Seu projeto estará no ar em minutos com Railway + AWS EC2 Free Tier!**
