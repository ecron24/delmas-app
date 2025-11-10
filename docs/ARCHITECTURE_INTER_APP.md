# 🏗️ Architecture Inter-App
## SaaS Multi-Tenant pour Gestion d'Interventions

**Version:** 1.0
**Date:** 2025-11-10
**Repository:** https://github.com/ecron24/inter-app
**Basé sur:** delmas-app (mono-tenant)

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Architecture Technique](#architecture-technique)
3. [Structure du Projet](#structure-du-projet)
4. [Stack Technique](#stack-technique)
5. [Architecture Multi-Tenant](#architecture-multi-tenant)
6. [Sécurité](#sécurité)
7. [Déploiement](#déploiement)
8. [Différences avec Delmas-App](#différences-avec-delmas-app)

---

## 🎯 Vue d'Ensemble

### Qu'est-ce qu'Inter-App ?

**Inter-App** est une plateforme SaaS B2B permettant aux entreprises de services (piscines, HVAC, plomberie, etc.) de gérer :
- 📅 Interventions et planning
- 👥 Clients et prospects
- 💰 Factures et devis
- 📦 Produits et catalogue
- 📊 Statistiques et rapports

### Modèle Multi-Tenant

**Chaque client = 1 Tenant**

```
Tenant "delmas"     → delmas.inter-app.com
Tenant "acme"       → acme.inter-app.com
Tenant "poolpro"    → poolpro.inter-app.com
```

**Isolation complète:**
- Données séparées par `tenant_id`
- RLS (Row Level Security) PostgreSQL
- Branding personnalisé par tenant
- Domaines personnalisés possibles (plan Pro+)

---

## 🏛️ Architecture Technique

### Architecture Globale

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare / DNS                        │
│  - SSL/TLS termination                                   │
│  - DDoS protection                                       │
│  - CDN                                                   │
│                                                          │
│  *.inter-app.com → Load Balancer                        │
│  custom-domain.com → Load Balancer                      │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Load Balancer (HAProxy/Nginx)               │
│  - Health checks                                         │
│  - SSL termination                                       │
│  - Rate limiting                                         │
└─────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Next.js    │  │  Next.js    │  │  Next.js    │
│  Instance 1 │  │  Instance 2 │  │  Instance 3 │
│             │  │             │  │             │
│  - SSR      │  │  - SSR      │  │  - SSR      │
│  - API      │  │  - API      │  │  - API      │
│  - Static   │  │  - Static   │  │  - Static   │
└─────────────┘  └─────────────┘  └─────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
         ┌───────────────────────────────┐
         │                               │
         ▼                               ▼
┌─────────────────────┐    ┌─────────────────────┐
│  Supabase           │    │  Services Externes   │
│  PostgreSQL         │    │                      │
│  - Auth             │    │  - Stripe (billing)  │
│  - Database         │    │  - Resend (email)    │
│  - Storage          │    │  - Gotenberg (PDF)   │
│  - Realtime         │    │  - Sentry (monitoring)│
└─────────────────────┘    └─────────────────────┘
```

---

### Architecture Application

```
┌────────────────────────────────────────────────────────┐
│                     Browser                             │
│  https://acme.inter-app.com                            │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│               Next.js Middleware                        │
│                                                         │
│  1. Parse subdomain: "acme"                            │
│  2. Fetch tenant from DB                               │
│  3. Check user has access to tenant                    │
│  4. Inject tenant_id in headers                        │
│  5. Redirect if unauthorized                            │
└────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│            React App (Client Side)                      │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │  TenantProvider (Context)                │         │
│  │  - Current tenant                         │         │
│  │  - Company settings                       │         │
│  │  - User role                              │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │  Pages & Components                       │         │
│  │  - Dashboard                              │         │
│  │  - Interventions                          │         │
│  │  - Clients                                │         │
│  │  - Invoices                               │         │
│  │  - Settings                               │         │
│  └──────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Server       │  │ API Routes   │  │ Supabase     │
│ Actions      │  │              │  │ Client       │
│              │  │ - REST       │  │              │
│ - getClients │  │ - PDF gen    │  │ - Realtime   │
│ - createInv  │  │ - Email      │  │ - Storage    │
│ - getInvoices│  │ - Webhooks   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
         ┌───────────────────────────────┐
         │   PostgreSQL (Supabase)        │
         │                                │
         │   Schema: public               │
         │   - tenants                    │
         │   - tenant_users               │
         │   - plan_limits                │
         │                                │
         │   Schema: saas_public          │
         │   - clients (tenant_id)        │
         │   - interventions (tenant_id)  │
         │   - products (tenant_id)       │
         │   - company_settings (tenant_id)│
         │   ... etc                      │
         │                                │
         │   Schema: saas_compta          │
         │   - invoices (tenant_id)       │
         │   - invoice_items (tenant_id)  │
         │                                │
         │   RLS Policies (per table):    │
         │   WHERE tenant_id IN           │
         │     (SELECT user_tenant_ids()) │
         └───────────────────────────────┘
```

---

## 📁 Structure du Projet

```
inter-app/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Tests CI
│       └── deploy.yml                # Déploiement automatique
│
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Routes authentification
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   │
│   ├── (public)/                     # Pages publiques
│   │   ├── pricing/
│   │   ├── features/
│   │   └── contact/
│   │
│   ├── (tenant)/                     # Routes protégées par tenant
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Dashboard principal
│   │   │   ├── interventions/
│   │   │   ├── clients/
│   │   │   ├── invoices/
│   │   │   ├── products/
│   │   │   ├── stats/
│   │   │   └── settings/
│   │   │       ├── company/          # Infos entreprise
│   │   │       ├── branding/         # Logo, couleurs
│   │   │       ├── users/            # Gestion utilisateurs
│   │   │       ├── subscription/     # Plans & facturation
│   │   │       └── integrations/     # API, webhooks
│   │   │
│   │   └── onboarding/               # Wizard onboarding
│   │       ├── page.tsx
│   │       └── [...step]/page.tsx
│   │
│   ├── api/                          # API Routes
│   │   ├── tenant/
│   │   │   ├── current/route.ts      # Info tenant actuel
│   │   │   └── users/
│   │   │       ├── route.ts          # Liste users
│   │   │       ├── invite/route.ts   # Inviter user
│   │   │       └── [id]/route.ts     # CRUD user
│   │   │
│   │   ├── tenants/
│   │   │   └── create/route.ts       # Créer tenant (signup)
│   │   │
│   │   ├── interventions/
│   │   │   └── [id]/
│   │   │       ├── send-to-client/route.ts
│   │   │       ├── create-invoice/route.ts
│   │   │       └── notify-completion/route.ts
│   │   │
│   │   ├── invoices/
│   │   │   └── [id]/
│   │   │       ├── send/route.ts
│   │   │       └── route.ts
│   │   │
│   │   ├── stripe/
│   │   │   ├── create-checkout-session/route.ts
│   │   │   ├── webhook/route.ts
│   │   │   └── portal/route.ts
│   │   │
│   │   └── webhooks/
│   │       ├── calendar/route.ts     # Google Calendar
│   │       └── n8n/route.ts
│   │
│   ├── components/                   # Composants réutilisables
│   │   ├── ui/                       # Composants UI de base
│   │   ├── clients/
│   │   ├── interventions/
│   │   ├── invoices/
│   │   ├── products/
│   │   ├── settings/
│   │   └── tenant/
│   │       ├── TenantSwitcher.tsx    # Multi-tenant (si user dans plusieurs)
│   │       └── TenantBranding.tsx    # Branding dynamique
│   │
│   ├── layout.tsx                    # Layout racine
│   ├── globals.css
│   └── not-found.tsx
│
├── lib/                              # Bibliothèques et utilitaires
│   ├── actions/                      # Server Actions
│   │   ├── tenants.ts
│   │   ├── clients.ts
│   │   ├── interventions.ts
│   │   ├── invoices.ts
│   │   ├── products.ts
│   │   ├── company-settings.ts
│   │   └── stats.ts
│   │
│   ├── contexts/                     # React Contexts
│   │   ├── TenantContext.tsx
│   │   └── UserContext.tsx
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── useTenant.ts
│   │   ├── useCompanySettings.ts
│   │   ├── usePlanLimits.ts
│   │   └── usePermissions.ts
│   │
│   ├── helpers/                      # Helpers
│   │   ├── tenant.ts                 # getCurrentTenantId(), etc.
│   │   ├── permissions.ts            # checkPermission()
│   │   ├── limits.ts                 # checkLimit()
│   │   └── formatting.ts
│   │
│   ├── supabase/                     # Clients Supabase
│   │   ├── client.ts                 # Client-side
│   │   ├── server.ts                 # Server-side
│   │   ├── webhook.ts                # Webhooks
│   │   └── admin.ts                  # Service role (admin)
│   │
│   ├── pdf/                          # Génération PDF
│   │   ├── generate-invoice-html.ts
│   │   ├── generate-invoice-pdf.ts
│   │   └── templates/
│   │       └── invoice.html
│   │
│   ├── email/                        # Templates email
│   │   ├── send-email.ts
│   │   └── templates/
│   │       ├── welcome.tsx
│   │       ├── invitation.tsx
│   │       ├── invoice.tsx
│   │       └── trial-ending.tsx
│   │
│   ├── stripe/                       # Stripe helpers
│   │   ├── client.ts
│   │   ├── plans.ts
│   │   └── webhooks.ts
│   │
│   └── types/                        # TypeScript types
│       ├── tenant.ts
│       ├── intervention.ts
│       ├── invoice.ts
│       └── user.ts
│
├── supabase/                         # Supabase
│   ├── migrations/                   # Migrations SQL
│   │   ├── 001_create_tenants_infrastructure.sql
│   │   ├── 002_add_tenant_id_to_tables.sql
│   │   ├── 003_migrate_delmas_tenant.sql
│   │   ├── 004_create_tenant_rls_policies.sql
│   │   ├── 005_helper_functions.sql
│   │   └── 006_rename_schemas.sql
│   │
│   └── seed.sql                      # Données de test
│
├── docs/                             # Documentation
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── MULTI_TENANCY.md
│   └── MIGRATION_FROM_DELMAS.md
│
├── scripts/                          # Scripts utilitaires
│   ├── migrate-schemas.sh
│   ├── check-missing-tenant-id.sh
│   ├── count-remaining-delmas.sh
│   ├── create-tenant.ts
│   └── backup-db.sh
│
├── tests/                            # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│       └── tenant-isolation.test.ts
│
├── public/                           # Assets statiques
│   ├── images/
│   ├── fonts/
│   └── favicon.ico
│
├── .env.example                      # Variables d'environnement template
├── .env.local                        # Variables locales (gitignored)
├── middleware.ts                     # Middleware Next.js (tenant detection)
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## 🛠️ Stack Technique

### Frontend

| Technologie | Version | Utilisation |
|------------|---------|-------------|
| **Next.js** | 15.x | Framework React, SSR, API Routes |
| **React** | 19.x | UI Library |
| **TypeScript** | 5.x | Typage statique |
| **Tailwind CSS** | 4.x | Styling utility-first |
| **Lucide React** | latest | Icônes |
| **React Hook Form** | 7.x | Formulaires |
| **Zod** | 3.x | Validation schémas |
| **date-fns** | 3.x | Manipulation dates |
| **Recharts** | 2.x | Graphiques dashboard |

### Backend

| Technologie | Utilisation |
|------------|-------------|
| **Supabase** | Backend-as-a-Service |
| **PostgreSQL** | Base de données |
| **Supabase Auth** | Authentification |
| **Supabase Storage** | Stockage fichiers (logos, PDFs) |
| **Supabase Realtime** | Notifications temps réel |
| **Stripe** | Paiements & abonnements |
| **Resend** | Envoi emails transactionnels |
| **Gotenberg** | Conversion HTML → PDF |

### Infrastructure

| Composant | Technologie |
|-----------|------------|
| **Hosting** | Vercel / Railway / Fly.io |
| **Database** | Supabase PostgreSQL |
| **Storage** | Supabase Storage (S3-compatible) |
| **CDN** | Cloudflare |
| **DNS** | Cloudflare |
| **Monitoring** | Sentry + Vercel Analytics |
| **CI/CD** | GitHub Actions |
| **Container** | Docker (Gotenberg) |

---

## 🔐 Architecture Multi-Tenant

### Modèle de Données

#### Schema: `public` (Global)

```sql
-- Tenants (clients SaaS)
tenants (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE,               -- acme, delmas, poolpro
  subdomain TEXT UNIQUE,          -- acme.inter-app.com
  subscription_plan TEXT,         -- trial, starter, pro, enterprise
  subscription_status TEXT,       -- trial, active, suspended, cancelled
  stripe_customer_id TEXT,
  is_active BOOLEAN
)

-- Liaison utilisateurs <-> tenants
tenant_users (
  tenant_id UUID REFERENCES tenants,
  user_id UUID REFERENCES auth.users,
  role TEXT,                      -- owner, admin, user, readonly
  is_active BOOLEAN,
  PRIMARY KEY (tenant_id, user_id)
)

-- Limites par plan
plan_limits (
  plan TEXT PRIMARY KEY,
  max_users INTEGER,
  max_clients INTEGER,
  max_interventions_per_month INTEGER,
  price_monthly_cents INTEGER
)
```

#### Schema: `saas_public` (Données métier)

**Toutes les tables ont `tenant_id`:**

```sql
clients (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants,  -- ✅ Isolation
  type TEXT,
  first_name TEXT,
  email TEXT,
  ...
)

interventions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants,  -- ✅ Isolation
  client_id UUID REFERENCES clients,
  status TEXT,
  scheduled_date TIMESTAMPTZ,
  ...
)

products (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants,  -- ✅ Isolation
  name TEXT,
  price NUMERIC,
  ...
)

company_settings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants,  -- ✅ Isolation
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT,
  ...
)
```

#### Schema: `saas_compta` (Comptabilité)

```sql
invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants,  -- ✅ Isolation
  intervention_id UUID,
  invoice_number TEXT,
  status TEXT,
  ...
)

invoice_number_sequences (
  tenant_id UUID,                               -- ✅ Par tenant
  year INTEGER,
  last_number INTEGER,
  PRIMARY KEY (tenant_id, year)
)
```

---

### Isolation des Données (RLS)

**Row Level Security sur chaque table:**

```sql
-- Exemple: clients
ALTER TABLE saas_public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select"
  ON saas_public.clients
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (SELECT user_tenant_ids())
  );

CREATE POLICY "tenant_isolation_insert"
  ON saas_public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT user_tenant_ids())
  );

-- user_tenant_ids() retourne les IDs des tenants de l'utilisateur
```

**Garantie:** Un utilisateur du tenant "acme" ne peut JAMAIS voir/modifier les données du tenant "poolpro".

---

### Flux Tenant Detection

```typescript
// middleware.ts

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')

  // 1. Extraire subdomain
  const subdomain = extractSubdomain(host) // "acme" depuis "acme.inter-app.com"

  // 2. Fetch tenant depuis DB
  const tenant = await getTenantBySubdomain(subdomain)

  if (!tenant) {
    return NextResponse.redirect('/tenant-not-found')
  }

  // 3. Vérifier accès user
  const user = await getUser()
  const hasAccess = await checkTenantAccess(tenant.id, user.id)

  if (!hasAccess) {
    return NextResponse.redirect('/unauthorized')
  }

  // 4. Injecter tenant_id dans headers
  const response = NextResponse.next()
  response.headers.set('x-tenant-id', tenant.id)
  response.headers.set('x-tenant-slug', tenant.slug)
  response.headers.set('x-user-role', userRole)

  return response
}
```

```typescript
// lib/helpers/tenant.ts

export async function getCurrentTenantId(): Promise<string> {
  const headersList = headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) {
    throw new Error('Tenant ID not found')
  }

  return tenantId
}
```

```typescript
// lib/actions/clients.ts

export async function getClients() {
  'use server'

  const supabase = createServerClient()
  const tenantId = await getCurrentTenantId() // ✅ Depuis headers

  const { data } = await supabase
    .schema('saas_public')
    .from('clients')
    .select('*')
    .eq('tenant_id', tenantId) // ✅ Filtrage tenant
    .order('created_at', { ascending: false })

  return data
}
```

---

## 🔒 Sécurité

### Principes

1. **Isolation complète par tenant**
   - RLS PostgreSQL sur toutes les tables
   - Tests d'isolation automatisés
   - Audit logs

2. **Authentification robuste**
   - Supabase Auth (bcrypt, JWT)
   - MFA disponible
   - Session management

3. **Autorisation granulaire**
   - Rôles: owner, admin, user, readonly
   - Permissions par rôle
   - Vérifications côté serveur

4. **Protection réseau**
   - HTTPS obligatoire
   - CORS configuré
   - Rate limiting (100 req/min)
   - DDoS protection (Cloudflare)

5. **Données sensibles**
   - Pas de données en clair (sauf si nécessaire)
   - Logs anonymisés
   - GDPR compliance
   - Export/Suppression données

### Checklist Sécurité

- ✅ RLS activée sur toutes les tables
- ✅ Middleware vérifie accès tenant
- ✅ Server actions vérifient tenant_id
- ✅ API routes vérifient tenant_id
- ✅ Headers sécurisés (CSP, X-Frame-Options)
- ✅ Rate limiting par IP
- ✅ Sanitization inputs (Zod)
- ✅ Secrets en variables d'environnement
- ✅ Backup quotidien automatique
- ✅ Monitoring erreurs (Sentry)

---

## 🚀 Déploiement

### Variables d'Environnement

```bash
# .env.example

# Application
NEXT_PUBLIC_APP_URL=https://inter-app.com
NEXT_PUBLIC_APP_NAME="Inter-App"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxxxx
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Plans Stripe
STRIPE_PRICE_STARTER=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx

# Email (Resend)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=no-reply@inter-app.com

# PDF (Gotenberg)
GOTENBERG_URL=http://gotenberg:3000

# Monitoring
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Redis (optionnel, cache)
REDIS_URL=redis://localhost:6379
```

### Commandes Déploiement

```bash
# Build
npm run build

# Migrations DB
npm run migrate

# Tests
npm run test

# Déploiement (Vercel)
vercel --prod

# Déploiement (Railway)
railway up

# Déploiement (Docker)
docker-compose up -d
```

### Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - gotenberg

  gotenberg:
    image: gotenberg/gotenberg:7
    ports:
      - "3001:3000"
```

---

## 🔄 Différences avec Delmas-App

| Aspect | Delmas-App | Inter-App |
|--------|-----------|-----------|
| **Architecture** | Mono-tenant | Multi-tenant |
| **Schémas DB** | `piscine_delmas_*` | `saas_*` |
| **Isolation** | ❌ Aucune | ✅ Par `tenant_id` + RLS |
| **Auth** | 3 emails hardcodés | Auth par organisation |
| **Branding** | "Delmas" fixe | Dynamique par tenant |
| **Domaines** | 1 seul | Subdomains + custom domains |
| **Utilisateurs** | 3 users | Illimité par plan |
| **Plans** | Gratuit unique | Trial, Starter, Pro, Enterprise |
| **Facturation** | N/A | Stripe |
| **Onboarding** | Manuel | Wizard automatisé |
| **Logo** | Emoji fixe | Upload par tenant |
| **Couleurs** | Hardcodées Tailwind | CSS variables dynamiques |
| **Numérotation factures** | Globale | Par tenant |
| **API publique** | ❌ | ✅ (plan Pro+) |
| **White-label** | ❌ | ✅ (plan Pro+) |

---

## 📊 Métriques et Monitoring

### Dashboards

**Métabase / Retool:**
- Nombre de tenants actifs
- MRR (Monthly Recurring Revenue)
- Churn rate
- Utilisation par plan
- Top features utilisées
- Performance queries

**Sentry:**
- Erreurs JavaScript
- Erreurs backend
- Performance tracing
- User feedback

**Vercel Analytics:**
- Page views
- Performance (TTFB, LCP, FID, CLS)
- Géographie utilisateurs

---

## 🎯 Prochaines Étapes

1. ✅ Finaliser migrations SQL
2. ✅ Refactorer code (ajouter tenant_id)
3. ✅ Tests d'isolation
4. ✅ Intégration Stripe
5. ✅ Page signup + onboarding
6. ✅ Migration client Delmas
7. 🔄 Beta test avec 3 nouveaux clients
8. 🔄 Lancement public

---

## 📞 Contact Développement

**Repository:** https://github.com/ecron24/inter-app
**Documentation:** https://docs.inter-app.com
**Issues:** https://github.com/ecron24/inter-app/issues

---

**🚀 Inter-App - Transformons Delmas-App en SaaS leader du marché!**
