# 🚀 Inter-App - Plateforme SaaS Multi-Tenant

**Inter-App** est une plateforme SaaS B2B permettant aux entreprises de services (piscines, HVAC, plomberie, etc.) de gérer leurs interventions, clients, devis et factures.

## 📋 Table des Matières

- [Architecture](#-architecture)
- [Plans Tarifaires](#-plans-tarifaires)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration Supabase](#-configuration-supabase)
- [Développement](#-développement)
- [Structure du Projet](#-structure-du-projet)
- [API Documentation](#-api-documentation)
- [Déploiement](#-déploiement)

---

## 🏗️ Architecture

Inter-App utilise une architecture **microservices** moderne :

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   Frontend      │────────▶│   Backend API   │────────▶│   Supabase      │
│   Next.js 14    │         │   Hono          │         │   PostgreSQL    │
│   (Port 3001)   │         │   (Port 3002)   │         │   + Auth        │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Stack Technique

**Frontend:**
- ⚡ Next.js 14 (App Router)
- 🎨 Tailwind CSS + shadcn/ui
- 🔐 Supabase Auth (client-side)
- 📦 Zustand (state management)

**Backend:**
- 🔥 Hono (ultra-rapide API framework)
- 🛡️ TypeScript
- ✅ Zod (validation)
- 🔒 JWT + Supabase Auth

**Base de données:**
- 🐘 PostgreSQL (via Supabase)
- 🔐 Row Level Security (RLS)
- 🔄 Multi-tenant isolation

---

## 💎 Plans Tarifaires

### 🆓 Free (Gratuit)
- **Prix:** 0€/mois
- **Utilisateurs:** 1
- **Features:**
  - ✅ Création fiches intervention (50 max)
  - ✅ Gestion clients (20 max)

### 🚀 Starter (50€/mois)
- **Utilisateurs:** 2
- **Features Free +**
  - ✅ Calendrier automatique
  - ✅ Module devis (illimité)
  - ✅ Module factures (illimité)
  - ✅ Marque blanche (logo, couleurs)

### 💎 Pro (190€/mois)
- **Utilisateurs:** 10 (équipe)
- **Features Starter +**
  - ✅ Export comptabilité
  - ✅ Statistiques avancées
  - ✅ Gestion équipe
  - ✅ Toutes futures fonctionnalités

### 🏢 Enterprise (Sur devis)
- **Utilisateurs:** Illimité
- **Développement sur mesure**

---

## 🛠️ Technologies

### Dépendances Principales

**Frontend:**
```json
"next": "^14.1.0",
"react": "^18.2.0",
"@supabase/supabase-js": "^2.39.0",
"@radix-ui/react-*": "dernières versions",
"tailwindcss": "^3.4.1",
"zod": "^3.22.4"
```

**Backend:**
```json
"hono": "^4.0.0",
"@supabase/supabase-js": "^2.39.0",
"zod": "^3.22.4",
"jose": "^5.2.0"
```

---

## 📦 Installation

### Prérequis

- Node.js 20+
- npm ou yarn
- Compte Supabase (gratuit)
- Git

### 1. Clone le Repository

```bash
git clone https://github.com/ecron24/inter-app.git
cd inter-app
```

### 2. Installation des Dépendances

```bash
# Frontend (racine)
npm install

# Backend API
cd inter-api
npm install
cd ..
```

### 3. Configuration Environnement

```bash
# Copier l'exemple
cp .env.example .env

# Éditer .env avec vos valeurs
nano .env
```

**Variables importantes:**
```env
# Supabase (depuis dashboard Supabase)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3002

# Secrets (générer avec: openssl rand -base64 32)
JWT_SECRET=votre_jwt_secret_ici
NEXTAUTH_SECRET=votre_nextauth_secret_ici
```

---

## 🗄️ Configuration Supabase

### 1. Créer un Projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier l'URL et les clés API

### 2. Exécuter les Migrations SQL

Dans le **SQL Editor** de Supabase, exécuter:

```bash
# Copier le contenu de:
supabase/migrations/001_initial_schema.sql
```

Ce script crée:
- ✅ Tables: tenants, users, clients, interventions, devis, factures
- ✅ Row Level Security (RLS) policies
- ✅ Indexes pour performance
- ✅ Triggers pour updated_at

### 3. Activer Supabase Auth

Dans **Authentication > Settings**:
- ✅ Activer Email Auth
- ✅ Désactiver email confirmation (ou configurer SMTP)
- ✅ Configurer les URL de redirection

---

## 🚀 Développement

### Méthode 1: Docker Compose (Recommandé)

```bash
# Démarrer tout
docker-compose up

# Frontend: http://localhost:3001
# Backend: http://localhost:3002
```

### Méthode 2: Manuel

**Terminal 1 - Backend API:**
```bash
cd inter-api
npm run dev
# API sur http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# App sur http://localhost:3001
```

### Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend Next.js | 3001 | http://localhost:3001 |
| Backend Hono API | 3002 | http://localhost:3002 |
| Supabase | - | https://xxxxx.supabase.co |

---

## 📁 Structure du Projet

```
inter-app/
├── inter-api/                    # 🔥 Backend Hono API
│   ├── src/
│   │   ├── index.ts             # Point d'entrée
│   │   ├── routes/              # Routes API
│   │   │   ├── auth.ts          # Auth (register, login)
│   │   │   ├── interventions.ts # CRUD interventions
│   │   │   ├── clients.ts       # CRUD clients
│   │   │   ├── devis.ts         # Devis (Starter+)
│   │   │   ├── factures.ts      # Factures (Starter+)
│   │   │   └── tenants.ts       # Settings tenant
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT auth
│   │   │   ├── feature-flags.ts # Plans & features
│   │   │   └── rate-limit.ts    # Rate limiting
│   │   ├── lib/
│   │   │   ├── supabase.ts      # Supabase client
│   │   │   └── validation.ts    # Zod schemas
│   │   └── types/
│   │       └── index.ts         # TypeScript types
│   ├── package.json
│   └── tsconfig.json
│
├── src/                          # ⚡ Frontend Next.js
│   ├── app/
│   │   ├── layout.tsx           # Layout principal
│   │   ├── page.tsx             # Page d'accueil
│   │   ├── globals.css          # Styles globaux
│   │   ├── auth/
│   │   │   ├── login/           # Page login
│   │   │   └── register/        # Page register
│   │   └── dashboard/
│   │       ├── page.tsx         # Dashboard
│   │       ├── interventions/   # Module interventions
│   │       ├── clients/         # Module clients
│   │       ├── devis/           # Module devis (Starter+)
│   │       ├── factures/        # Module factures (Starter+)
│   │       └── parametres/      # Paramètres tenant
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── input.tsx
│   │   └── modules/             # Composants métier
│   ├── lib/
│   │   ├── utils.ts             # Utilitaires
│   │   ├── supabase.ts          # Supabase client
│   │   └── api-client.ts        # API client
│   └── types/                   # TypeScript types
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql # Migration SQL
│
├── docs/                         # 📚 Documentation
│   ├── ANALYSE_DEPENDENCIES_DELMAS.md
│   ├── ARCHITECTURE_INTER_APP.md
│   ├── GUIDE_MIGRATION_SQL.md
│   ├── PLAN_TRANSFORMATION_SAAS.md
│   └── SPECIFICATIONS_SAAS.md
│
├── docker-compose.yml            # Config Docker
├── package.json                  # Frontend deps
├── next.config.js               # Config Next.js
├── tailwind.config.ts           # Config Tailwind
├── tsconfig.json                # Config TypeScript
├── .env.example                 # Template env
├── .gitignore
└── README.md                    # Ce fichier
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3002/api
```

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "tenant_slug": "monentreprise",
  "tenant_name": "Mon Entreprise"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJxxx...",
  "refresh_token": "eyJxxx...",
  "user": {...},
  "tenant": {...}
}
```

### Protected Endpoints

**Headers requis:**
```http
Authorization: Bearer eyJxxx...
```

#### Interventions (Free+)

```http
GET    /api/interventions           # Liste
GET    /api/interventions/:id       # Détail
POST   /api/interventions           # Créer
PATCH  /api/interventions/:id       # Modifier
DELETE /api/interventions/:id       # Supprimer
```

#### Clients (Free+)

```http
GET    /api/clients                 # Liste
GET    /api/clients/:id             # Détail
POST   /api/clients                 # Créer
PATCH  /api/clients/:id             # Modifier
DELETE /api/clients/:id             # Supprimer
```

#### Devis (Starter+)

```http
GET    /api/devis                   # Liste
GET    /api/devis/:id               # Détail
POST   /api/devis                   # Créer
PATCH  /api/devis/:id               # Modifier
DELETE /api/devis/:id               # Supprimer
POST   /api/devis/:id/accept        # Accepter
```

#### Factures (Starter+)

```http
GET    /api/factures                # Liste
GET    /api/factures/:id            # Détail
POST   /api/factures                # Créer
PATCH  /api/factures/:id            # Modifier
DELETE /api/factures/:id            # Supprimer
POST   /api/factures/:id/payment    # Enregistrer paiement
POST   /api/factures/:id/export-accounting  # Export compta (Pro+)
```

#### Tenant

```http
GET    /api/tenants/me              # Info tenant
PATCH  /api/tenants/me              # Modifier settings
GET    /api/tenants/me/users        # Liste users
GET    /api/tenants/me/subscription # Info abonnement
GET    /api/tenants/me/stats        # Statistiques
```

---

## 🎨 Développement Frontend

### Ajouter un Composant shadcn/ui

Les composants shadcn/ui sont déjà configurés. Pour en ajouter:

```bash
# Exemple: Ajouter Dialog
npx shadcn-ui@latest add dialog
```

Composants disponibles:
- Button, Card, Input (déjà inclus)
- Dialog, Dropdown, Select, Tabs, Toast, etc.

### Créer une Nouvelle Page

```tsx
// src/app/dashboard/nouveau-module/page.tsx
'use client'

import { Card } from '@/components/ui/card'

export default function NouveauModulePage() {
  return (
    <div>
      <h1>Nouveau Module</h1>
      {/* Contenu */}
    </div>
  )
}
```

### Utiliser l'API Client

```tsx
import { apiClient } from '@/lib/api-client'

// Dans un composant
const loadData = async () => {
  const token = localStorage.getItem('access_token')
  apiClient.setToken(token)

  const data = await apiClient.getInterventions()
  console.log(data)
}
```

---

## 🔐 Sécurité

### Feature Flags

Le backend vérifie automatiquement les permissions:

```typescript
// Middleware sur route Devis (Starter+)
devis.use('/*', requireFeature('devis'))

// Vérification des limites
interventions.post('/', checkUsageLimit('interventions'), ...)
```

### Row Level Security (RLS)

Toutes les données sont isolées par `tenant_id` au niveau SQL:

```sql
-- Exemple: Users ne voient que leur tenant
CREATE POLICY users_select_policy ON users
  FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));
```

---

## 🚢 Déploiement

### Déploiement sur VPS

```bash
# Sur votre serveur
cd ~/obotcall/obotcall-stack-2

# Cloner
git clone https://github.com/ecron24/inter-app.git
cd inter-app

# Configurer .env
cp .env.example .env
nano .env

# Démarrer avec Docker
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### Production Checklist

- [ ] Configurer .env production
- [ ] Générer secrets sécurisés
- [ ] Configurer domaine custom
- [ ] Activer HTTPS (Nginx + Let's Encrypt)
- [ ] Configurer Supabase production
- [ ] Tester les migrations SQL
- [ ] Vérifier les RLS policies
- [ ] Configurer backups DB
- [ ] Monitoring & logs

---

## 📝 TODO / Fonctionnalités à Développer

### Frontend

- [ ] Page register complète
- [ ] Dashboard layout avec navigation
- [ ] Module Interventions (CRUD complet)
- [ ] Module Clients (CRUD complet)
- [ ] Module Devis (liste, création, PDF)
- [ ] Module Factures (liste, paiements, PDF)
- [ ] Module Calendrier (Starter+)
- [ ] Page Paramètres (marque blanche)
- [ ] Module Statistiques avancées (Pro+)
- [ ] Module Team & utilisateurs (Pro+)
- [ ] Export comptabilité (Pro+)
- [ ] Responsive mobile
- [ ] Mode sombre

### Backend

- [ ] Email notifications (SendGrid/Resend)
- [ ] Génération PDF (devis/factures)
- [ ] Export comptabilité (API comptables)
- [ ] Webhooks pour paiements
- [ ] Cron jobs (factures en retard)
- [ ] Analytics & tracking
- [ ] Tests unitaires
- [ ] Tests d'intégration

### Infrastructure

- [ ] CI/CD Pipeline
- [ ] Staging environment
- [ ] Monitoring (Sentry, Datadog)
- [ ] Backups automatiques
- [ ] Load balancing (scaling)

---

## 🤝 Contribution

Ce projet est privé. Pour contribuer:

1. Créer une branche depuis `main`
2. Développer la feature
3. Tests et linting
4. Pull Request avec description claire

---

## 📄 License

Propriétaire - Tous droits réservés

---

## 🆘 Support

Pour toute question:
- **Email:** support@inter-app.com
- **Documentation:** [docs/](./docs/)

---

**Créé avec ❤️ par l'équipe Inter-App**
