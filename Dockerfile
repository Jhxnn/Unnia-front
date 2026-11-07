# Etapa 1: empacota o app com o Node.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: o nginx serve os arquivos estáticos e repassa /api para a API.
# O endereço da API vem de API_UPSTREAM (o nginx preenche o modelo ao iniciar).
FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://api:8080
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q --spider http://127.0.0.1/ || exit 1
