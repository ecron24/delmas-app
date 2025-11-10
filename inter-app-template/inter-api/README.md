# 🔥 Inter-API - Backend Hono

Backend API REST ultra-rapide pour Inter-App, construit avec Hono.

## 🚀 Quick Start

```bash
# Installation
npm install

# Développement
npm run dev

# Build
npm run build

# Production
npm start
```

## 📡 Endpoints

Voir documentation complète dans [README.md](../README.md#-api-documentation)

## 🔒 Sécurité

- JWT Authentication via Supabase
- Row Level Security (RLS)
- Rate Limiting
- Feature Flags par plan
- Input Validation (Zod)

## 🏗️ Architecture

```
src/
├── index.ts              # Point d'entrée
├── routes/               # Routes API
│   ├── auth.ts          # Auth (public)
│   ├── interventions.ts # CRUD interventions
│   ├── clients.ts       # CRUD clients
│   ├── devis.ts         # Devis (Starter+)
│   ├── factures.ts      # Factures (Starter+)
│   └── tenants.ts       # Tenant settings
├── middleware/
│   ├── auth.ts          # JWT validation
│   ├── feature-flags.ts # Plan checks
│   └── rate-limit.ts    # Rate limiting
├── lib/
│   ├── supabase.ts      # Supabase client
│   └── validation.ts    # Zod schemas
└── types/
    └── index.ts         # TypeScript types
```

## 🔐 Feature Flags

Routes automatiquement protégées selon le plan:

| Feature | Plan Minimum | Routes Affectées |
|---------|--------------|------------------|
| interventions | Free | `/api/interventions/*` |
| clients | Free | `/api/clients/*` |
| devis | Starter | `/api/devis/*` |
| factures | Starter | `/api/factures/*` |
| calendrier | Starter | `/api/calendar/*` (à impl.) |
| comptabilite | Pro | `/api/factures/:id/export-accounting` |

## 🛡️ Middleware

### Auth Middleware

```typescript
// Toutes les routes protégées utilisent:
app.use('/api/*', authMiddleware)

// Vérifie:
// - Token JWT valide
// - User actif
// - Tenant actif
// - Subscription status
```

### Feature Flags Middleware

```typescript
// Exemple: Route devis (Starter+)
devis.use('/*', requireFeature('devis'))

// Retourne 403 si plan insuffisant
```

### Rate Limiter

```typescript
// 100 requêtes par 15 minutes par IP
app.use('/api/*', rateLimiter(100, 15 * 60 * 1000))
```

## 📝 Validation

Tous les inputs sont validés avec Zod:

```typescript
const createInterventionSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(3),
  status: z.enum(['pending', 'scheduled', ...]),
  // ...
})
```

## 🚢 Production

Variables d'environnement requises:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
CORS_ORIGIN=https://votre-domaine.com
```

## 📊 Performance

- Hono est **2-3x plus rapide** que Express
- Validation Zod optimisée
- Queries SQL optimisées avec indexes
- Rate limiting pour éviter abus

## 🧪 Tests (TODO)

```bash
npm test
```
