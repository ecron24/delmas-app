# 🗄️ Guide de Migration SQL Multi-Tenant
## Scripts Complets pour la Transformation

**Version:** 1.0
**Date:** 2025-11-10
**Base de données:** PostgreSQL (Supabase)
**Durée estimée:** 2-3 heures (avec tests)

---

## ⚠️ AVERTISSEMENT IMPORTANT

**AVANT TOUTE MIGRATION:**

1. ✅ **BACKUP COMPLET** de la base de données
2. ✅ **TESTER** sur une copie de la DB d'abord
3. ✅ **FENÊTRE DE MAINTENANCE** annoncée aux utilisateurs
4. ✅ **SCRIPT DE ROLLBACK** préparé
5. ✅ **VÉRIFICATIONS** post-migration documentées

**Commande backup PostgreSQL:**
```bash
pg_dump -h [SUPABASE_HOST] -U postgres -d postgres -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump
```

**Restauration si besoin:**
```bash
pg_restore -h [SUPABASE_HOST] -U postgres -d postgres -v backup_XXXXXXXX_XXXXXX.dump
```

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Migration 001: Infrastructure Tenants](#migration-001)
3. [Migration 002: Ajout tenant_id](#migration-002)
4. [Migration 003: Migration Delmas](#migration-003)
5. [Migration 004: RLS Policies](#migration-004)
6. [Migration 005: Fonctions Helpers](#migration-005)
7. [Migration 006: Renommage Schémas](#migration-006-optionnel)
8. [Vérifications Post-Migration](#vérifications)
9. [Rollback](#rollback)

---

## 🎯 Vue d'Ensemble

### Ordre d'Exécution

```
001_create_tenants_infrastructure.sql
  ↓
002_add_tenant_id_to_tables.sql
  ↓
003_migrate_delmas_tenant.sql
  ↓
004_create_tenant_rls_policies.sql
  ↓
005_helper_functions.sql
  ↓
006_rename_schemas.sql (optionnel)
```

### Temps d'Exécution Estimé

| Migration | Durée | Risque |
|-----------|-------|--------|
| 001 | 5 min | 🟢 Faible |
| 002 | 10 min | 🟡 Moyen |
| 003 | 15 min | 🔴 Élevé |
| 004 | 20 min | 🟡 Moyen |
| 005 | 5 min | 🟢 Faible |
| 006 | 10 min | 🟡 Moyen |
| **TOTAL** | **~65 min** | - |

---

## <a name="migration-001"></a>Migration 001: Infrastructure Tenants

**Fichier:** `/supabase/migrations/001_create_tenants_infrastructure.sql`

```sql
-- ============================================================================
-- Migration 001: Infrastructure Tenants
-- Crée les tables globales pour gérer les tenants et utilisateurs
-- ============================================================================

-- Table: tenants
-- Description: Représente chaque client SaaS (entreprise)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]{3,30}$'),
  company_name TEXT NOT NULL,

  -- Domaines
  subdomain TEXT UNIQUE CHECK (subdomain ~ '^[a-z0-9-]{3,30}$'),
  custom_domain TEXT UNIQUE,

  -- Subscription
  subscription_plan TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_plan IN ('trial', 'starter', 'pro', 'enterprise')),
  subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled')),

  -- Trial
  trial_ends_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT false,

  -- Billing (Stripe)
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  suspended_reason TEXT,
  suspended_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Search (full-text search)
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('french', coalesce(company_name, '') || ' ' || coalesce(slug, ''))
  ) STORED
);

-- Index pour performance
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON public.tenants(custom_domain);
CREATE INDEX idx_tenants_subscription_status ON public.tenants(subscription_status);
CREATE INDEX idx_tenants_is_active ON public.tenants(is_active);
CREATE INDEX idx_tenants_search ON public.tenants USING GIN(search_vector);
CREATE INDEX idx_tenants_created_at ON public.tenants(created_at DESC);

-- Commentaires
COMMENT ON TABLE public.tenants IS 'Tenants SaaS - chaque ligne = 1 entreprise cliente';
COMMENT ON COLUMN public.tenants.slug IS 'Identifiant URL-friendly unique (ex: acme, delmas)';
COMMENT ON COLUMN public.tenants.subdomain IS 'Sous-domaine (ex: acme.inter-app.com)';
COMMENT ON COLUMN public.tenants.subscription_plan IS 'Plan souscrit: trial, starter, pro, enterprise';

-- ============================================================================
-- Table: tenant_users
-- Description: Liaison entre utilisateurs (auth.users) et tenants
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_users (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role
  role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('owner', 'admin', 'user', 'readonly')),

  -- Invitation
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  invitation_accepted_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (tenant_id, user_id)
);

-- Index
CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX idx_tenant_users_role ON public.tenant_users(tenant_id, role);
CREATE INDEX idx_tenant_users_is_active ON public.tenant_users(tenant_id, is_active);

-- Commentaires
COMMENT ON TABLE public.tenant_users IS 'Liaison N-N entre tenants et utilisateurs avec rôles';
COMMENT ON COLUMN public.tenant_users.role IS 'owner: propriétaire, admin: admin, user: utilisateur standard, readonly: lecture seule';

-- ============================================================================
-- Table: plan_limits
-- Description: Limites par plan (max users, clients, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan TEXT PRIMARY KEY CHECK (plan IN ('trial', 'starter', 'pro', 'enterprise')),

  -- Limits
  max_users INTEGER NOT NULL,
  max_clients INTEGER NOT NULL,
  max_interventions_per_month INTEGER NOT NULL,
  max_storage_gb INTEGER NOT NULL,
  max_products INTEGER NOT NULL,

  -- Features
  has_api_access BOOLEAN DEFAULT false,
  has_custom_domain BOOLEAN DEFAULT false,
  has_white_label BOOLEAN DEFAULT false,
  has_advanced_reports BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_webhooks BOOLEAN DEFAULT false,

  -- Pricing (en centimes d'euros)
  price_monthly_cents INTEGER NOT NULL,
  price_yearly_cents INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default limits
INSERT INTO public.plan_limits (
  plan,
  max_users,
  max_clients,
  max_interventions_per_month,
  max_storage_gb,
  max_products,
  has_api_access,
  has_custom_domain,
  has_white_label,
  has_advanced_reports,
  has_priority_support,
  has_webhooks,
  price_monthly_cents,
  price_yearly_cents
) VALUES
  -- Trial: 14 jours gratuits, limites réduites
  ('trial', 1, 50, 100, 1, 100, false, false, false, false, false, false, 0, 0),

  -- Starter: 49€/mois, petites entreprises
  ('starter', 2, 200, 500, 5, 500, false, false, false, false, false, false, 4900, 49000),

  -- Pro: 99€/mois, entreprises en croissance
  ('pro', 10, 1000, 2000, 20, 2000, true, true, true, true, false, true, 9900, 99000),

  -- Enterprise: sur devis, illimité
  ('enterprise', 999, 999999, 999999, 100, 999999, true, true, true, true, true, true, 0, 0)
ON CONFLICT (plan) DO NOTHING;

-- Commentaires
COMMENT ON TABLE public.plan_limits IS 'Limites et features par plan de subscription';

-- ============================================================================
-- Fonction: Obtenir tenant_id actuel depuis le contexte
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION public.current_tenant_id IS 'Retourne le tenant_id du contexte actuel (set par le middleware)';

-- ============================================================================
-- Fonction: Vérifier accès utilisateur à un tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_has_tenant_access(tenant_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_users
    WHERE tenant_id = tenant_uuid
    AND user_id = auth.uid()
    AND is_active = true
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_has_tenant_access IS 'Vérifie si l utilisateur courant a accès au tenant spécifié';

-- ============================================================================
-- Fonction: Obtenir les tenant_ids de l'utilisateur courant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.user_tenant_ids()
RETURNS SETOF UUID AS $$
  SELECT tenant_id
  FROM public.tenant_users
  WHERE user_id = auth.uid()
  AND is_active = true;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.user_tenant_ids IS 'Retourne les IDs de tous les tenants accessibles par l utilisateur courant';

-- ============================================================================
-- RLS Policies pour tenants
-- ============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Lecture seule pour users authentifiés
CREATE POLICY "Users can view their own tenants"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.user_tenant_ids())
  );

-- Policy: Seuls les owners peuvent modifier leur tenant
CREATE POLICY "Owners can update their tenant"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id
      FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT tenant_id
      FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND role = 'owner'
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS Policies pour tenant_users
-- ============================================================================
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users voient leurs propres appartenances
CREATE POLICY "Users can view their own tenant memberships"
  ON public.tenant_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Owners et admins gèrent les users de leur tenant
CREATE POLICY "Owners and admins can manage tenant users"
  ON public.tenant_users
  FOR ALL
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id
      FROM public.tenant_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- ============================================================================
-- RLS Policies pour plan_limits (lecture seule publique)
-- ============================================================================
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan limits are publicly readable"
  ON public.plan_limits
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- Trigger: Mise à jour automatique de updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_tenant_users_updated_at
BEFORE UPDATE ON public.tenant_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_plan_limits_updated_at
BEFORE UPDATE ON public.plan_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Fin Migration 001
-- ============================================================================
```

**Vérification après exécution:**
```sql
-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'tenant_users', 'plan_limits');

-- Vérifier les plans insérés
SELECT plan, max_users, max_clients, price_monthly_cents/100 as price_eur
FROM public.plan_limits
ORDER BY price_monthly_cents;

-- Vérifier les fonctions
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%tenant%';
```

**Résultat attendu:**
- 3 tables créées
- 4 plans insérés (trial, starter, pro, enterprise)
- 4 fonctions créées

---

## <a name="migration-002"></a>Migration 002: Ajout tenant_id aux Tables

**Fichier:** `/supabase/migrations/002_add_tenant_id_to_tables.sql`

```sql
-- ============================================================================
-- Migration 002: Ajout tenant_id à toutes les tables métier
-- ============================================================================

-- Liste des tables du schéma public
DO $$
DECLARE
  public_tables TEXT[] := ARRAY[
    'clients',
    'interventions',
    'intervention_items',
    'intervention_types_junction',
    'pools',
    'pool_types',
    'products',
    'product_categories',
    'technicians',
    'profiles',
    'task_templates',
    'prospect_status',
    'pricing_config',
    'company_settings',
    'suppliers',
    'settings',
    'sync_metadata',
    'email_logs'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY public_tables LOOP
    -- Ajouter colonne tenant_id (nullable pour l'instant)
    EXECUTE format('
      ALTER TABLE piscine_delmas_public.%I
      ADD COLUMN IF NOT EXISTS tenant_id UUID
      REFERENCES public.tenants(id) ON DELETE CASCADE
    ', t);

    -- Créer index
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%I_tenant
      ON piscine_delmas_public.%I(tenant_id)
    ', t, t);

    RAISE NOTICE 'Added tenant_id to piscine_delmas_public.%', t;
  END LOOP;
END $$;

-- ============================================================================
-- Tables du schéma comptabilité
-- ============================================================================

-- invoices
ALTER TABLE piscine_delmas_compta.invoices
  ADD COLUMN IF NOT EXISTS tenant_id UUID
  REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant
  ON piscine_delmas_compta.invoices(tenant_id);

-- invoice_items
ALTER TABLE piscine_delmas_compta.invoice_items
  ADD COLUMN IF NOT EXISTS tenant_id UUID
  REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant
  ON piscine_delmas_compta.invoice_items(tenant_id);

-- invoice_number_sequences
ALTER TABLE piscine_delmas_compta.invoice_number_sequences
  ADD COLUMN IF NOT EXISTS tenant_id UUID
  REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoice_number_sequences_tenant
  ON piscine_delmas_compta.invoice_number_sequences(tenant_id);

-- Modifier la clé primaire de invoice_number_sequences pour inclure tenant_id
ALTER TABLE piscine_delmas_compta.invoice_number_sequences
  DROP CONSTRAINT IF EXISTS invoice_number_sequences_pkey;

ALTER TABLE piscine_delmas_compta.invoice_number_sequences
  ADD PRIMARY KEY (tenant_id, year);

-- ============================================================================
-- Index composites pour performance
-- ============================================================================

-- Clients: recherche par tenant + email/nom
CREATE INDEX IF NOT EXISTS idx_clients_tenant_email
  ON piscine_delmas_public.clients(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_clients_tenant_name
  ON piscine_delmas_public.clients(tenant_id, last_name, first_name);

-- Interventions: recherche par tenant + statut/date
CREATE INDEX IF NOT EXISTS idx_interventions_tenant_status
  ON piscine_delmas_public.interventions(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_interventions_tenant_date
  ON piscine_delmas_public.interventions(tenant_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_interventions_tenant_client
  ON piscine_delmas_public.interventions(tenant_id, client_id);

-- Invoices: recherche par tenant + statut/date
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status
  ON piscine_delmas_compta.invoices(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_date
  ON piscine_delmas_compta.invoices(tenant_id, issue_date DESC);

-- Products: recherche par tenant + catégorie
CREATE INDEX IF NOT EXISTS idx_products_tenant_category
  ON piscine_delmas_public.products(tenant_id, category_id);

-- ============================================================================
-- Vérification
-- ============================================================================

-- Compter les tables avec tenant_id ajouté
DO $$
DECLARE
  count_public INTEGER;
  count_compta INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_public
  FROM information_schema.columns
  WHERE table_schema = 'piscine_delmas_public'
  AND column_name = 'tenant_id';

  SELECT COUNT(*) INTO count_compta
  FROM information_schema.columns
  WHERE table_schema = 'piscine_delmas_compta'
  AND column_name = 'tenant_id';

  RAISE NOTICE 'Tables avec tenant_id dans piscine_delmas_public: %', count_public;
  RAISE NOTICE 'Tables avec tenant_id dans piscine_delmas_compta: %', count_compta;

  IF count_public < 18 THEN
    RAISE WARNING 'Certaines tables piscine_delmas_public n ont pas tenant_id!';
  END IF;

  IF count_compta < 3 THEN
    RAISE WARNING 'Certaines tables piscine_delmas_compta n ont pas tenant_id!';
  END IF;
END $$;

-- ============================================================================
-- Fin Migration 002
-- ============================================================================
```

**Vérification après exécution:**
```sql
-- Vérifier toutes les colonnes tenant_id ajoutées
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'tenant_id'
AND table_schema IN ('piscine_delmas_public', 'piscine_delmas_compta')
ORDER BY table_schema, table_name;

-- Vérifier les index créés
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE indexname LIKE '%tenant%'
AND schemaname IN ('piscine_delmas_public', 'piscine_delmas_compta')
ORDER BY schemaname, tablename;
```

**Résultat attendu:**
- 18 tables dans `piscine_delmas_public` avec `tenant_id`
- 3 tables dans `piscine_delmas_compta` avec `tenant_id`
- ~30 index créés

---

## <a name="migration-003"></a>Migration 003: Migration Tenant Delmas

**Fichier:** `/supabase/migrations/003_migrate_delmas_tenant.sql`

```sql
-- ============================================================================
-- Migration 003: Création et Migration du Tenant Delmas
-- ⚠️ CRITIQUE: Cette migration migre toutes les données existantes
-- ============================================================================

-- ============================================================================
-- Étape 1: Créer le tenant Delmas
-- ============================================================================
INSERT INTO public.tenants (
  slug,
  company_name,
  subdomain,
  subscription_plan,
  subscription_status,
  is_active,
  trial_used,
  created_at
) VALUES (
  'delmas',
  'PISCINE DELMAS',
  'delmas',
  'enterprise',  -- Plan gratuit/personnalisé pour client historique
  'active',
  true,
  true,  -- Trial déjà utilisé
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
  company_name = EXCLUDED.company_name,
  subdomain = EXCLUDED.subdomain,
  updated_at = NOW()
RETURNING id;

-- ============================================================================
-- Étape 2: Assigner les utilisateurs Delmas au tenant
-- ============================================================================
DO $$
DECLARE
  delmas_tenant_id UUID;
  delmas_emails TEXT[] := ARRAY[
    'oppsyste@gmail.com',
    'stephanedelmas69@gmail.com',
    'christophemenoire@gmail.com'
  ];
  user_email TEXT;
  user_record RECORD;
BEGIN
  -- Récupérer l'ID du tenant Delmas
  SELECT id INTO delmas_tenant_id
  FROM public.tenants
  WHERE slug = 'delmas';

  IF delmas_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant Delmas not found!';
  END IF;

  RAISE NOTICE 'Delmas tenant ID: %', delmas_tenant_id;

  -- Assigner les 3 utilisateurs Delmas comme owners
  FOREACH user_email IN ARRAY delmas_emails LOOP
    SELECT id, email INTO user_record
    FROM auth.users
    WHERE email = user_email;

    IF user_record.id IS NOT NULL THEN
      INSERT INTO public.tenant_users (
        tenant_id,
        user_id,
        role,
        is_active,
        invited_at,
        invitation_accepted_at,
        created_at
      ) VALUES (
        delmas_tenant_id,
        user_record.id,
        'owner',
        true,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, user_id) DO UPDATE
      SET
        role = 'owner',
        is_active = true,
        updated_at = NOW();

      RAISE NOTICE 'Assigned user % as owner', user_email;
    ELSE
      RAISE WARNING 'User % not found in auth.users', user_email;
    END IF;
  END LOOP;

END $$;

-- ============================================================================
-- Étape 3: Migrer les données existantes vers le tenant Delmas
-- ============================================================================
DO $$
DECLARE
  delmas_tenant_id UUID;
  updated_count INTEGER;
BEGIN
  -- Récupérer l'ID du tenant Delmas
  SELECT id INTO delmas_tenant_id
  FROM public.tenants
  WHERE slug = 'delmas';

  IF delmas_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant Delmas not found!';
  END IF;

  -- Clients
  UPDATE piscine_delmas_public.clients
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % clients', updated_count;

  -- Interventions
  UPDATE piscine_delmas_public.interventions
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % interventions', updated_count;

  -- Intervention items
  UPDATE piscine_delmas_public.intervention_items
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % intervention_items', updated_count;

  -- Intervention types junction
  UPDATE piscine_delmas_public.intervention_types_junction
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % intervention_types_junction', updated_count;

  -- Pools
  UPDATE piscine_delmas_public.pools
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % pools', updated_count;

  -- Pool types
  UPDATE piscine_delmas_public.pool_types
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % pool_types', updated_count;

  -- Products
  UPDATE piscine_delmas_public.products
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % products', updated_count;

  -- Product categories
  UPDATE piscine_delmas_public.product_categories
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % product_categories', updated_count;

  -- Technicians
  UPDATE piscine_delmas_public.technicians
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % technicians', updated_count;

  -- Profiles
  UPDATE piscine_delmas_public.profiles
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % profiles', updated_count;

  -- Task templates
  UPDATE piscine_delmas_public.task_templates
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % task_templates', updated_count;

  -- Prospect status
  UPDATE piscine_delmas_public.prospect_status
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % prospect_status', updated_count;

  -- Pricing config
  UPDATE piscine_delmas_public.pricing_config
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % pricing_config', updated_count;

  -- Company settings
  UPDATE piscine_delmas_public.company_settings
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % company_settings', updated_count;

  -- Suppliers
  UPDATE piscine_delmas_public.suppliers
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % suppliers', updated_count;

  -- Settings
  UPDATE piscine_delmas_public.settings
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % settings', updated_count;

  -- Sync metadata
  UPDATE piscine_delmas_public.sync_metadata
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % sync_metadata', updated_count;

  -- Email logs
  UPDATE piscine_delmas_public.email_logs
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % email_logs', updated_count;

  -- ======== Schéma compta ========

  -- Invoices
  UPDATE piscine_delmas_compta.invoices
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % invoices', updated_count;

  -- Invoice items
  UPDATE piscine_delmas_compta.invoice_items
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % invoice_items', updated_count;

  -- Invoice number sequences
  UPDATE piscine_delmas_compta.invoice_number_sequences
  SET tenant_id = delmas_tenant_id
  WHERE tenant_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % invoice_number_sequences', updated_count;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'Migration Delmas completed successfully!';
  RAISE NOTICE '====================================';

END $$;

-- ============================================================================
-- Étape 4: Rendre tenant_id NOT NULL
-- ⚠️ Ceci échouera s'il reste des lignes sans tenant_id
-- ============================================================================
DO $$
DECLARE
  public_tables TEXT[] := ARRAY[
    'clients', 'interventions', 'intervention_items',
    'intervention_types_junction', 'pools', 'pool_types',
    'products', 'product_categories', 'technicians',
    'profiles', 'task_templates', 'prospect_status',
    'pricing_config', 'company_settings', 'suppliers',
    'settings', 'sync_metadata', 'email_logs'
  ];
  t TEXT;
  null_count INTEGER;
BEGIN
  -- Vérifier qu'il n'y a pas de NULL restants
  FOREACH t IN ARRAY public_tables LOOP
    EXECUTE format('SELECT COUNT(*) FROM piscine_delmas_public.%I WHERE tenant_id IS NULL', t)
    INTO null_count;

    IF null_count > 0 THEN
      RAISE EXCEPTION 'Table % still has % rows with NULL tenant_id', t, null_count;
    END IF;
  END LOOP;

  -- Rendre NOT NULL
  FOREACH t IN ARRAY public_tables LOOP
    EXECUTE format('ALTER TABLE piscine_delmas_public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    RAISE NOTICE 'Made tenant_id NOT NULL on piscine_delmas_public.%', t;
  END LOOP;

END $$;

-- Tables compta
ALTER TABLE piscine_delmas_compta.invoices
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE piscine_delmas_compta.invoice_items
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE piscine_delmas_compta.invoice_number_sequences
  ALTER COLUMN tenant_id SET NOT NULL;

RAISE NOTICE 'All tenant_id columns are now NOT NULL';

-- ============================================================================
-- Vérification finale
-- ============================================================================
DO $$
DECLARE
  delmas_tenant_id UUID;
  client_count INTEGER;
  intervention_count INTEGER;
  invoice_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT id INTO delmas_tenant_id FROM public.tenants WHERE slug = 'delmas';

  SELECT COUNT(*) INTO client_count
  FROM piscine_delmas_public.clients
  WHERE tenant_id = delmas_tenant_id;

  SELECT COUNT(*) INTO intervention_count
  FROM piscine_delmas_public.interventions
  WHERE tenant_id = delmas_tenant_id;

  SELECT COUNT(*) INTO invoice_count
  FROM piscine_delmas_compta.invoices
  WHERE tenant_id = delmas_tenant_id;

  SELECT COUNT(*) INTO user_count
  FROM public.tenant_users
  WHERE tenant_id = delmas_tenant_id;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'Delmas Tenant Summary:';
  RAISE NOTICE 'Tenant ID: %', delmas_tenant_id;
  RAISE NOTICE 'Users: %', user_count;
  RAISE NOTICE 'Clients: %', client_count;
  RAISE NOTICE 'Interventions: %', intervention_count;
  RAISE NOTICE 'Invoices: %', invoice_count;
  RAISE NOTICE '====================================';
END $$;

-- ============================================================================
-- Fin Migration 003
-- ============================================================================
```

**Vérification après exécution:**
```sql
-- Vérifier tenant Delmas créé
SELECT * FROM public.tenants WHERE slug = 'delmas';

-- Vérifier utilisateurs assignés
SELECT tu.role, u.email
FROM public.tenant_users tu
JOIN auth.users u ON u.id = tu.user_id
WHERE tu.tenant_id = (SELECT id FROM public.tenants WHERE slug = 'delmas');

-- Vérifier données migrées
SELECT
  (SELECT COUNT(*) FROM piscine_delmas_public.clients WHERE tenant_id = t.id) as clients,
  (SELECT COUNT(*) FROM piscine_delmas_public.interventions WHERE tenant_id = t.id) as interventions,
  (SELECT COUNT(*) FROM piscine_delmas_compta.invoices WHERE tenant_id = t.id) as invoices
FROM public.tenants t
WHERE t.slug = 'delmas';

-- Vérifier qu'il n'y a plus de NULL
SELECT
  table_schema,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c2
   WHERE c2.table_schema = c.table_schema
   AND c2.table_name = c.table_name
   AND c2.column_name = 'tenant_id'
   AND c2.is_nullable = 'NO') as is_not_null
FROM information_schema.columns c
WHERE column_name = 'tenant_id'
AND table_schema IN ('piscine_delmas_public', 'piscine_delmas_compta')
GROUP BY table_schema, table_name;
```

---

**✅ À ce stade, vous avez:**
1. ✅ Créé l'infrastructure tenants
2. ✅ Ajouté tenant_id à toutes les tables
3. ✅ Migré les données Delmas vers le premier tenant

**Prochaines étapes:** RLS policies, fonctions helpers, et optionnellement renommer les schémas.

Je continue avec les migrations 004, 005 et 006 dans le prochain message pour ne pas dépasser les limites.

---

## <a name="migration-004"></a>Migration 004: RLS Policies Multi-Tenant

*(Suite dans le document...)*

---

**Note:** Ce guide contient 6 migrations SQL complètes. Je peux continuer avec les 3 dernières migrations si vous le souhaitez.
