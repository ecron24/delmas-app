# 📋 Spécifications détaillées : PoolTech SaaS

**Version** : 1.0
**Date** : 2025-10-30
**Auteur** : Équipe technique
**Base** : delmas-app (version mono-tenant)

---

## 🎯 Vision et objectifs

### Vision produit
**PoolTech SaaS** est une plateforme multi-tenant de gestion d'interventions pour les professionnels de la piscine et services à domicile (plomberie, électricité, maintenance, etc.).

### Objectifs business
- 🎯 **Lancement** : Q1 2026
- 🎯 **Beta** : 5-10 entreprises (Février 2026)
- 🎯 **Objectif 1 an** : 50 entreprises payantes
- 🎯 **MRR cible** : 5 000€/mois à 12 mois

### Positionnement marché
- **Cible primaire** : TPE/PME piscines (1-10 techniciens)
- **Cible secondaire** : Artisans services à domicile
- **Différenciation** : Simplicité + mobile-first + signature électronique

---

## 🏗️ Architecture technique

### Stack technologique (identique à delmas-app)
```
Frontend : Next.js 14 + React 18 + TypeScript + Tailwind CSS
Backend  : Supabase (PostgreSQL + Auth + Storage + Realtime)
PDF      : Gotenberg
Email    : Resend
Paiement : Stripe (nouveau)
Analytics: Posthog ou Mixpanel (nouveau)
```

### Architecture multi-tenant

#### Modèle d'isolation
```
Isolation au niveau BASE DE DONNÉES (shared database, shared schema)
- Une seule base Supabase
- Une seule instance Next.js
- Isolation par tenant_id + RLS (Row Level Security)
```

**Avantages** :
- ✅ Coûts réduits (une seule infra)
- ✅ Maintenance simplifiée
- ✅ Mises à jour simultanées pour tous
- ✅ Scaling facile (Supabase gère)

**Sécurité** :
- ✅ RLS (Row Level Security) sur toutes les tables
- ✅ Policies Supabase automatiques
- ✅ Isolation garantie par PostgreSQL

---

## 📊 Modèle de données

### Nouvelles tables (spécifiques SaaS)

#### Table `tenants` (entreprises)
```sql
CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations entreprise
  company_name text NOT NULL,
  slug text UNIQUE NOT NULL, -- Ex: delmas-piscines

  -- Adresse
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'FR',

  -- Coordonnées
  phone text,
  email text,
  website text,

  -- Identifiants légaux
  siret text,
  tva_number text,
  tva_rate numeric(5,2) DEFAULT 20.00,

  -- Abonnement
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (
    subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'paused')
  ),
  subscription_plan text NOT NULL DEFAULT 'starter' CHECK (
    subscription_plan IN ('starter', 'pro', 'enterprise')
  ),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text,

  -- Limites par plan
  max_users integer DEFAULT 3,
  max_interventions_per_month integer DEFAULT 50,
  max_storage_mb integer DEFAULT 1000,

  -- Dates
  trial_ends_at timestamptz,
  subscribed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Metadata
  settings jsonb DEFAULT '{}',
  onboarding_completed boolean DEFAULT false
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);
```

#### Table `profiles` (utilisateurs)
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lien tenant
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations personnelles
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,

  -- Rôle
  role text NOT NULL DEFAULT 'technician' CHECK (
    role IN ('admin', 'ceo', 'technician', 'secretary')
  ),

  -- Métadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz,

  -- Préférences
  settings jsonb DEFAULT '{}'
);

CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON profiles
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Tables métier adaptées (ajout tenant_id)

Toutes les tables métier existantes reçoivent :
```sql
ALTER TABLE clients ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE interventions ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE invoices ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE pools ADD COLUMN tenant_id uuid REFERENCES tenants(id);
ALTER TABLE products ADD COLUMN tenant_id uuid REFERENCES tenants(id);
-- etc.
```

---

## 👥 Système de rôles et permissions

### Les 4 rôles

#### 1. **admin** (développeur/ops uniquement)
**Qui** : oppsyste@gmail.com uniquement

**Permissions** :
- ✅ Accès à TOUS les tenants (super admin)
- ✅ Gestion des webhooks, API keys
- ✅ Accès aux logs et monitoring
- ✅ Support technique niveau 3
- ✅ Migrations de base de données

**Interface** :
- Dashboard admin global (`/admin`)
- Liste de tous les tenants
- Analytics multi-tenants
- Health checks

---

#### 2. **ceo** (propriétaire entreprise)
**Qui** : Gérant, propriétaire de l'entreprise cliente

**Permissions** :
- ✅ Voir/modifier tous les clients de SON tenant
- ✅ Voir/assigner toutes les interventions de SON tenant
- ✅ Gérer les factures et devis
- ✅ Voir les statistiques et rapports
- ✅ Gérer les paramètres entreprise (tarifs, TVA, coordonnées)
- ✅ Créer/supprimer des utilisateurs (technician, secretary)
- ✅ Gérer l'abonnement (upgrade/downgrade)

**Restrictions** :
- ❌ Voir les données des autres tenants
- ❌ Accès aux paramètres techniques (webhooks, API)
- ❌ Modifier le schéma de base de données

**Interface** :
- Dashboard complet (`/dashboard`)
- Section settings avec gestion abonnement

---

#### 3. **technician** (technicien terrain)
**Qui** : Techniciens, intervenants

**Permissions** :
- ✅ Voir SES interventions assignées
- ✅ Modifier le statut de SES interventions
- ✅ Ajouter des photos à SES interventions
- ✅ Capturer la signature client
- ✅ Voir les infos clients de SES interventions
- ✅ Ajouter des produits/services à SES interventions

**Restrictions** :
- ❌ Voir les interventions des autres techniciens
- ❌ Voir/modifier les tarifs et prix
- ❌ Créer/supprimer des clients
- ❌ Accès aux factures et finances
- ❌ Modifier les paramètres

**Interface** :
- Dashboard simplifié (`/dashboard`)
- Focus sur les interventions du jour
- Vue calendrier personnelle

---

#### 4. **secretary** (secrétariat/admin)
**Qui** : Secrétaire, administratif

**Permissions** :
- ✅ Voir/créer/modifier tous les clients
- ✅ Voir toutes les interventions (lecture seule)
- ✅ Créer des devis et factures
- ✅ Importer/exporter des documents
- ✅ Gérer le calendrier (créer/déplacer des RDV)
- ✅ Assigner des interventions aux techniciens

**Restrictions** :
- ❌ Voir les marges et prix d'achat
- ❌ Modifier les paramètres entreprise (tarifs, TVA)
- ❌ Gérer les utilisateurs
- ❌ Modifier le statut des interventions (démarrer/terminer)
- ❌ Gérer l'abonnement

**Interface** :
- Dashboard complet (`/dashboard`)
- Pas d'accès à `/settings/billing`

---

## 💰 Modèle d'abonnement

### Plans tarifaires

#### Starter - 29€/mois
```
✅ 3 utilisateurs max
✅ 50 interventions/mois
✅ 1 Go de stockage
✅ Factures PDF
✅ Signature électronique
✅ Support email (48h)
❌ Pas de calendrier partagé
❌ Pas d'export comptable
```

**Cible** : Auto-entrepreneurs, très petites entreprises

---

#### Pro - 79€/mois (RECOMMANDÉ)
```
✅ 10 utilisateurs max
✅ 200 interventions/mois
✅ 5 Go de stockage
✅ Tout du plan Starter
✅ Calendrier partagé Google
✅ Export comptable (CSV, Excel)
✅ Rapports avancés
✅ Support prioritaire (24h)
✅ Personnalisation documents (logo, couleurs)
```

**Cible** : PME, entreprises établies (5-10 techniciens)

---

#### Enterprise - 199€/mois
```
✅ Utilisateurs illimités
✅ Interventions illimitées
✅ 20 Go de stockage
✅ Tout du plan Pro
✅ API access (webhooks custom)
✅ Support prioritaire (4h)
✅ Formation personnalisée
✅ Onboarding assisté
✅ Multi-sites
```

**Cible** : Grandes entreprises, franchises

---

### Période d'essai
- 🎁 **14 jours gratuits** (tous les plans)
- 🎁 **Aucune carte bancaire requise** pour démarrer
- 🎁 **Migration assistée** pour les + de 100 interventions

---

## 🚀 Parcours utilisateur

### Onboarding entreprise (nouveau client)

#### Étape 1 : Inscription (`/signup`)
```
- Email professionnel
- Nom de l'entreprise
- Téléphone
→ Création du tenant + compte CEO
```

#### Étape 2 : Configuration entreprise (`/onboarding/company`)
```
- Adresse complète
- SIRET (optionnel)
- Numéro TVA (optionnel)
- Taux TVA (par défaut 20%)
→ Mise à jour tenant.settings
```

#### Étape 3 : Choix du plan (`/onboarding/plan`)
```
- Sélection Starter / Pro / Enterprise
- Période d'essai activée automatiquement
→ tenant.subscription_status = 'trial'
```

#### Étape 4 : Premier client (`/onboarding/first-client`)
```
- Créer un client de test
- Voir l'interface
→ onboarding_completed = true
```

#### Étape 5 : Dashboard
```
→ Redirection vers /dashboard
→ Message de bienvenue + tour guidé
```

---

### Gestion abonnement

#### Upgrade (Starter → Pro)
```
/settings/billing
→ Bouton "Passer à Pro"
→ Stripe Checkout
→ Webhook Stripe → mise à jour tenant.subscription_plan
→ Déblocage features Pro
```

#### Renouvellement automatique
```
- Stripe charge automatiquement tous les mois
- Webhook 'invoice.payment_succeeded' → tenant.subscription_status = 'active'
- Webhook 'invoice.payment_failed' → tenant.subscription_status = 'past_due'
```

#### Annulation
```
/settings/billing
→ Bouton "Annuler l'abonnement"
→ Confirmation (modal)
→ Stripe annule l'abonnement (fin de période)
→ Webhook → tenant.subscription_status = 'canceled'
→ Accès en lecture seule jusqu'à la fin de la période payée
```

---

## 🔐 Sécurité et isolation

### Row Level Security (RLS)

Toutes les tables métier ont des policies :
```sql
-- Exemple pour clients
CREATE POLICY tenant_isolation ON clients
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Exemple pour interventions avec restriction par rôle
CREATE POLICY technician_own_interventions ON interventions
  FOR SELECT
  USING (
    tenant_id = current_setting('app.current_tenant_id')::uuid
    AND (
      current_setting('app.current_user_role') IN ('admin', 'ceo', 'secretary')
      OR assigned_technician_id = current_setting('app.current_user_id')::uuid
    )
  );
```

### Middleware Next.js

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const user = await getUser();
  const tenant = await getTenant(user.tenant_id);

  // Vérifier le statut d'abonnement
  if (tenant.subscription_status === 'past_due') {
    return redirect('/billing/past-due');
  }

  if (tenant.subscription_status === 'canceled') {
    return redirect('/billing/canceled');
  }

  // Injecter tenant_id dans le contexte Supabase
  await supabase.rpc('set_current_tenant', { tenant_id: tenant.id });

  // Vérifier les permissions par route
  if (!hasPermission(user.role, request.nextUrl.pathname)) {
    return redirect('/unauthorized');
  }

  return response;
}
```

---

## 📱 Interfaces utilisateur

### Dashboard admin (`/admin`) - Role: admin uniquement

**Vue principale** :
```
┌─────────────────────────────────────────────────┐
│  PoolTech Admin                                 │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Métriques globales                          │
│  ├─ 127 tenants actifs                         │
│  ├─ 1,234 utilisateurs totaux                  │
│  ├─ 5,678 interventions ce mois                │
│  └─ 8,450€ MRR                                  │
│                                                  │
│  📋 Tenants récents                             │
│  ┌──────────────────────────────────────┐      │
│  │ Delmas Piscines      | Active | Pro │      │
│  │ Aqua Services        | Trial  | Starter│    │
│  │ Pool Expert Lyon     | Past due | Pro│     │
│  └──────────────────────────────────────┘      │
│                                                  │
│  🔍 Recherche tenant                            │
│  🚨 Alertes (3)                                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

### Dashboard métier (`/dashboard`) - Tous les rôles

**Vue CEO/Secretary** :
```
┌─────────────────────────────────────────────────┐
│  Delmas Piscines                    [Profil▼] │
├─────────────────────────────────────────────────┤
│                                                  │
│  📊 Aujourd'hui                                 │
│  ├─ 8 interventions planifiées                 │
│  ├─ 3 en cours                                  │
│  └─ 2 devis en attente                         │
│                                                  │
│  📅 Calendrier de la semaine                    │
│  [Vue calendrier]                               │
│                                                  │
│  💰 Chiffres du mois                           │
│  ├─ 12,450€ facturé                            │
│  ├─ 3,200€ en attente                          │
│  └─ 45 interventions complétées                │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Vue Technician** :
```
┌─────────────────────────────────────────────────┐
│  Mes interventions                  [Profil▼] │
├─────────────────────────────────────────────────┤
│                                                  │
│  📅 Aujourd'hui - 30 Oct 2025                  │
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │ 09:00 - M. Dupont                    │      │
│  │ 📍 12 rue de la Piscine, Lyon       │      │
│  │ 🔧 Entretien annuel                 │      │
│  │ [Démarrer]                           │      │
│  └──────────────────────────────────────┘      │
│                                                  │
│  ┌──────────────────────────────────────┐      │
│  │ 14:00 - Mme Martin                   │      │
│  │ 📍 5 avenue des Fleurs, Villeurbanne│      │
│  │ 🛠️ Réparation pompe                 │      │
│  │ [Démarrer]                           │      │
│  └──────────────────────────────────────┘      │
│                                                  │
│  📊 Cette semaine : 12 interventions            │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 📊 Analytics et reporting

### Métriques par tenant (CEO uniquement)

**Dashboard stats** :
```
- Chiffre d'affaires mensuel
- Nombre d'interventions par type
- Taux de conversion devis → intervention
- Temps moyen par intervention
- Clients actifs vs inactifs
- Performance par technicien
```

### Métriques admin (admin SaaS uniquement)

**Dashboard admin** :
```
- MRR (Monthly Recurring Revenue)
- Churn rate
- Nouveaux tenants ce mois
- Tenants actifs par plan
- Interventions totales
- Stockage utilisé
- Taux de conversion trial → payant
```

---

## 🚀 Fonctionnalités à développer (roadmap)

### Phase 1 : MVP SaaS (6-8 semaines)
```
✅ Architecture multi-tenant (RLS)
✅ Système de rôles (4 rôles)
✅ Onboarding entreprise
✅ Intégration Stripe (paiements)
✅ Dashboard admin
✅ Gestion abonnements
✅ Landing page + pricing
```

### Phase 2 : Fonctionnalités avancées (2-3 mois)
```
🔲 Calendrier partagé (Google Calendar multi-users)
🔲 Export comptable (CSV, Excel)
🔲 Rapports avancés (PDF)
🔲 Personnalisation documents (logo, couleurs)
🔲 API publique (webhooks)
🔲 Multi-sites (pour franchises)
```

### Phase 3 : Optimisations (3-6 mois)
```
🔲 Application mobile (React Native)
🔲 Mode hors-ligne (PWA)
🔲 Intégrations tierces (Zapier, Make)
🔲 IA : suggestions de produits
🔲 IA : détection de problèmes sur photos
```

---

## 🔧 Différences techniques delmas-app → pooltech-saas

### Base de données
```
delmas-app                    pooltech-saas
├── Schema: piscine_delmas   ├── Schema: public
├── clients (no tenant_id)   ├── clients (+ tenant_id)
├── interventions            ├── interventions (+ tenant_id)
└── company_settings (1 row) └── tenants (multi-rows)
```

### Authentification
```
delmas-app                          pooltech-saas
├── Whitelist hardcodée (3 emails) ├── Table profiles avec role
├── isAdmin() par email             ├── hasPermission(role, action)
└── Pas de profiles table           └── RLS automatique
```

### Routes
```
delmas-app                    pooltech-saas
/dashboard                    /dashboard (identique)
/dashboard/clients            /dashboard/clients (+ RLS)
/dashboard/interventions      /dashboard/interventions (+ RLS)
                              + /admin (nouveau)
                              + /signup (nouveau)
                              + /onboarding (nouveau)
                              + /settings/billing (nouveau)
                              + / (landing page)
```

---

## 📦 Déploiement

### Environnements

```
Production  : pooltech-saas.com       (Vercel Pro)
Staging     : staging.pooltech-saas.com (Vercel)
Development : localhost:3000
```

### Variables d'environnement

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend (emails)
RESEND_API_KEY=

# Gotenberg (PDF)
GOTENBERG_URL=

# Analytics (optionnel)
NEXT_PUBLIC_POSTHOG_KEY=
```

---

## 📝 Checklist avant lancement

### Technique
- [ ] RLS activé sur toutes les tables
- [ ] Tests end-to-end (Playwright)
- [ ] Tests de charge (100 tenants simulés)
- [ ] Monitoring (Sentry)
- [ ] Backups automatiques (Supabase)
- [ ] CI/CD (GitHub Actions)

### Légal
- [ ] CGV (Conditions Générales de Vente)
- [ ] RGPD (Politique de confidentialité)
- [ ] Mentions légales
- [ ] DPA (Data Processing Agreement)

### Marketing
- [ ] Landing page optimisée SEO
- [ ] Google Analytics
- [ ] Blog (articles SEO)
- [ ] Documentation utilisateur

### Business
- [ ] Stripe configuré (webhooks)
- [ ] Support email configuré
- [ ] Onboarding automatisé testé
- [ ] Facturation automatique testée

---

## 📞 Support technique

### Support client (par plan)

**Starter** : Email (48h)
**Pro** : Email prioritaire (24h) + Chat
**Enterprise** : Téléphone (4h) + Email + Chat + Account manager

### Support technique (admin)

**Logs** : Supabase Dashboard + Sentry
**Monitoring** : Vercel Analytics + Uptime Robot
**Alertes** : Email/SMS si downtime

---

## 🎯 Métriques de succès

### 3 mois post-lancement
- 🎯 20 tenants payants
- 🎯 2 000€ MRR
- 🎯 < 5% churn rate
- 🎯 80% conversion trial → payant

### 6 mois post-lancement
- 🎯 50 tenants payants
- 🎯 5 000€ MRR
- 🎯 < 3% churn rate
- 🎯 85% conversion trial → payant

### 12 mois post-lancement
- 🎯 100 tenants payants
- 🎯 10 000€ MRR
- 🎯 < 2% churn rate
- 🎯 90% satisfaction client (NPS > 50)

---

**Document préparé pour la migration de delmas-app vers pooltech-saas**
**Prochaine étape** : Liste des fichiers à copier/adapter/créer
