FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar NestJS)
RUN npm install

# Copiar el código fuente
COPY . .

# Compilar TypeScript a JavaScript en /app/dist
RUN npm run build

# Etapa final ligera para producción
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --omit=dev

# Copiar artefactos compilados desde el builder
COPY --from=builder /app/dist ./dist

# Puerto por defecto (Railway asigna PORT dinámicamente)
EXPOSE 3001

CMD ["node", "dist/main.js"]

