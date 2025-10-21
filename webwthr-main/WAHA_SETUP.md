# Configuração WAHA na AWS EC2 Free Tier

## 🚀 WAHA (WhatsApp HTTP API) - Setup na AWS EC2

### 1. Criar Instância EC2 Free Tier
```bash
# Acesse AWS Console > EC2 > Launch Instance
# Escolha:
- Amazon Linux 2 AMI (HVM)
- t2.micro (Free Tier)
- 8GB SSD (Free Tier)
- Security Group: SSH (22), HTTP (80), Custom TCP (3001)
```

### 2. Conectar na Instância
```bash
ssh -i your-key.pem ec2-user@your-instance-ip
```

### 3. Instalar Docker e Docker Compose
```bash
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout e login novamente para aplicar grupo docker
exit
ssh -i your-key.pem ec2-user@your-instance-ip
```

### 4. Criar docker-compose.yml para WAHA
```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  waha:
    image: devlikeapro/waha:latest
    container_name: waha
    ports:
      - "3001:3000"
    environment:
      - WAHA_DASHBOARD_USERNAME=admin
      - WAHA_DASHBOARD_PASSWORD=your-secure-password
    volumes:
      - ./waha-data:/app/.waha
    restart: unless-stopped
EOF
```

### 5. Executar WAHA
```bash
docker-compose up -d
```

### 6. Verificar se está rodando
```bash
docker-compose ps
curl http://localhost:3001/ping
```

### 7. Configurar Domain (Opcional)
```bash
# Instalar nginx
sudo yum install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Criar configuração nginx
sudo tee /etc/nginx/conf.d/waha.conf > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo nginx -t
sudo systemctl reload nginx
```

### 8. Configurar SSL (Let's Encrypt)
```bash
sudo yum install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### 9. Configurar no Railway
No painel do Railway, adicione a variável de ambiente:
```
WAHA_API_BASE=http://your-ec2-ip:3001
# ou se usar domain:
WAHA_API_BASE=https://your-domain.com
```

## 🔧 Comandos Úteis

### Ver logs do WAHA
```bash
docker-compose logs -f waha
```

### Reiniciar WAHA
```bash
docker-compose restart waha
```

### Atualizar WAHA
```bash
docker-compose pull
docker-compose up -d
```

### Backup dos dados
```bash
tar -czf waha-backup-$(date +%Y%m%d).tar.gz waha-data/
```

## ⚠️ Importante
- **Custo**: $0 por 12 meses no Free Tier
- **Após 12 meses**: ~$8/mês (t2.micro)
- **Monitorar**: Configure alertas de uso no AWS
- **Backup**: Faça backup regular dos dados WAHA

## 🔗 Links Úteis
- [WAHA Documentation](https://waha.devlike.pro/)
- [AWS EC2 Free Tier](https://aws.amazon.com/free/)
- [Docker Compose](https://docs.docker.com/compose/)