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

# Instalar dependências
RUN npm ci && cd server && npm ci

# Copiar código fonte
COPY . .

# Build do backend e frontend
RUN cd server && npm run build
RUN npm run build

# Limpar cache npm para reduzir tamanho da imagem
RUN npm cache clean --force && rm -rf /tmp/*

# Expor portas
EXPOSE 3000 4000

# Comando para iniciar ambos os serviços
CMD ["sh", "-c", "npm run start:production"]