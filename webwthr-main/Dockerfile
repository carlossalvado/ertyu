FROM node:18-alpine

# Instalar dependências do sistema para puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Definir variáveis de ambiente para Puppeteer e otimização
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copiar arquivos de configuração primeiro (para cache de layers)
COPY package*.json ./
COPY server/package*.json ./server/

# Instalar dependências completas para build
RUN npm ci

# Copiar código fonte
COPY . .

# Instalar dependências do server separadamente
RUN cd server && npm ci

# Build do backend primeiro (mais rápido)
RUN cd server && npm run build

# Build do frontend com otimizações
RUN npm run build

# Limpar cache npm para reduzir tamanho da imagem
RUN npm cache clean --force && rm -rf /tmp/*

# Limpar cache npm para reduzir tamanho da imagem
RUN npm cache clean --force && rm -rf /tmp/*

# Expor portas
EXPOSE 3000 4000

# Comando para iniciar ambos os serviços
CMD ["sh", "-c", "npm run start:production"]