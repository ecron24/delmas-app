-- ============================================
-- MIGRATION 001: Créer la table tenants
-- Description: Table principale pour stocker les entreprises clientes (multi-tenant)
-- Date: 2025-10-30
-- ============================================

-- ============================================
-- TABLE: tenants (entreprises clientes)
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  -- Identifiant
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations entreprise
  company_name text NOT NULL,
  slug text UNIQUE NOT NULL, -- URL-friendly, ex: delmas-piscines

  -- Adresse
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'FR',

  -- Coordonnées
  phone text,
  email text NOT NULL,
  website text,

  -- Identifiants légaux français
  siret text,
  tva_number text,
  tva_rate numeric(5,2) DEFAULT 20.00 CHECK (tva_rate >= 0 AND tva_rate <= 100),

  -- Logo et branding
  logo_url text,
  primary_color text DEFAULT '#3B82F6', -- Bleu par défaut
  secondary_color text DEFAULT '#10B981', -- Vert par défaut

  -- Statut d'abonnement
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (
    subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'paused')
  ),
  subscription_plan text NOT NULL DEFAULT 'starter' CHECK (
    subscription_plan IN ('starter', 'pro', 'enterprise')
  ),

  -- Intégration Stripe
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text,
  stripe_price_id text, -- ID du plan Stripe actuel

  -- Limites par plan (quotas)
  max_users integer DEFAULT 3,
  max_interventions_per_month integer DEFAULT 50,
  max_storage_mb integer DEFAULT 1000, -- 1 Go

  -- Dates importantes
  trial_ends_at timestamptz,
  subscribed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Onboarding
  onboarding_completed boolean DEFAULT false,
  onboarding_step integer DEFAULT 1,

  -- Paramètres métier (JSON flexible)
  settings jsonb DEFAULT '{
    "default_labor_rate": 45.00,
    "default_travel_fee": 30.00,
    "invoice_numbering_prefix": "FA",
    "invoice_numbering_start": 1,
    "intervention_numbering_prefix": "INT",
    "quote_numbering_prefix": "DEV",
    "enable_google_calendar": false,
    "enable_signature": true,
    "enable_photos": true,
    "timezone": "Europe/Paris"
  }'::jsonb,

  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb
);

-- ============================================
-- INDEX pour performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_plan ON tenants(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants(created_at DESC);

-- ============================================
-- TRIGGER pour updated_at automatique
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTAIRES sur les colonnes
-- ============================================

COMMENT ON TABLE tenants IS 'Entreprises clientes (multi-tenant SaaS)';

COMMENT ON COLUMN tenants.id IS 'Identifiant unique du tenant';
COMMENT ON COLUMN tenants.company_name IS 'Nom de l''entreprise (affiché partout)';
COMMENT ON COLUMN tenants.slug IS 'Slug URL-friendly pour sous-domaines futurs (ex: delmas-piscines)';
COMMENT ON COLUMN tenants.subscription_status IS 'Statut abonnement: trial, active, past_due, canceled, paused';
COMMENT ON COLUMN tenants.subscription_plan IS 'Plan tarifaire: starter (29€), pro (79€), enterprise (199€)';
COMMENT ON COLUMN tenants.max_users IS 'Nombre maximum d''utilisateurs selon le plan';
COMMENT ON COLUMN tenants.max_interventions_per_month IS 'Quota mensuel d''interventions selon le plan';
COMMENT ON COLUMN tenants.max_storage_mb IS 'Quota de stockage en Mo selon le plan';
COMMENT ON COLUMN tenants.settings IS 'Paramètres métier personnalisables par tenant';
COMMENT ON COLUMN tenants.onboarding_completed IS 'True si l''onboarding initial est terminé';

-- ============================================
-- FONCTION : Générer un slug unique
-- ============================================

CREATE OR REPLACE FUNCTION generate_unique_slug(company_name text)
RETURNS text AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Nettoyer le nom d'entreprise pour créer un slug
  base_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;

  -- Ajouter un suffixe si le slug existe déjà
  WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_unique_slug IS 'Génère un slug unique à partir du nom d''entreprise';

-- ============================================
-- FONCTION : Vérifier les quotas du tenant
-- ============================================

CREATE OR REPLACE FUNCTION check_tenant_quota(
  p_tenant_id uuid,
  p_quota_type text -- 'users', 'interventions', 'storage'
)
RETURNS boolean AS $$
DECLARE
  v_current_count integer;
  v_max_allowed integer;
  v_tenant tenants%ROWTYPE;
BEGIN
  -- Récupérer les infos du tenant
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;

  -- Vérifier selon le type de quota
  CASE p_quota_type
    WHEN 'users' THEN
      SELECT COUNT(*) INTO v_current_count FROM profiles WHERE tenant_id = p_tenant_id;
      v_max_allowed := v_tenant.max_users;

    WHEN 'interventions' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM interventions
      WHERE tenant_id = p_tenant_id
        AND scheduled_date >= date_trunc('month', CURRENT_DATE);
      v_max_allowed := v_tenant.max_interventions_per_month;

    WHEN 'storage' THEN
      -- TODO: Calculer le stockage réel (photos + documents)
      v_current_count := 0;
      v_max_allowed := v_tenant.max_storage_mb;

    ELSE
      RAISE EXCEPTION 'Unknown quota type: %', p_quota_type;
  END CASE;

  -- Retourner true si quota OK, false si dépassé
  RETURN v_current_count < v_max_allowed;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_tenant_quota IS 'Vérifie si un tenant a atteint son quota (users, interventions, storage)';

-- ============================================
-- VALIDATION
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenants') THEN
    RAISE EXCEPTION 'Table tenants was not created';
  END IF;

  RAISE NOTICE '✅ Migration 001: Table tenants créée avec succès';
END $$;
