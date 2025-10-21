FROM node:20-alpine

WORKDIR /app

# Installer les dépendances système
RUN apk add --no-cache libc6-compat curl

# Copier package.json
COPY package*.json ./

# Installer les dépendances
RUN npm install --legacy-peer-deps

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3000

# Variables d'environnement
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Démarrer Next.js en mode dev
CMD ["npm", "run", "dev"]
