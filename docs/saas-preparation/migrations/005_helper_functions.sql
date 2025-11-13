-- ============================================
-- MIGRATION 005: Fonctions helpers SaaS
-- Description: Fonctions utilitaires pour le multi-tenant et la gestion SaaS
-- Date: 2025-10-30
-- ============================================

-- ============================================
-- FONCTION : Créer un nouveau tenant (onboarding)
-- ============================================

CREATE OR REPLACE FUNCTION create_new_tenant(
  p_company_name text,
  p_email text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_plan text DEFAULT 'starter'
)
RETURNS TABLE(
  tenant_id uuid,
  user_id uuid,
  slug text
) AS $$
DECLARE
  v_tenant_id uuid;
  v_slug text;
  v_user_id uuid;
BEGIN
  -- Générer un slug unique
  v_slug := generate_unique_slug(p_company_name);

  -- Créer le tenant
  INSERT INTO tenants (
    company_name,
    slug,
    email,
    subscription_status,
    subscription_plan,
    trial_ends_at,
    onboarding_step
  ) VALUES (
    p_company_name,
    v_slug,
    p_email,
    'trial',
    p_plan,
    now() + interval '14 days', -- 14 jours d'essai
    1
  )
  RETURNING id INTO v_tenant_id;

  -- Créer le compte CEO (sera lié après signup Supabase Auth)
  -- Note: L'utilisateur doit d'abord s'inscrire via Supabase Auth
  -- Cette fonction sera appelée APRÈS le signup

  RETURN QUERY SELECT v_tenant_id, v_user_id, v_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_new_tenant IS 'Crée un nouveau tenant (entreprise) avec compte CEO';

-- ============================================
-- FONCTION : Ajouter un utilisateur à un tenant
-- ============================================

CREATE OR REPLACE FUNCTION add_user_to_tenant(
  p_user_id uuid,
  p_tenant_id uuid,
  p_role text,
  p_full_name text,
  p_email text
)
RETURNS uuid AS $$
BEGIN
  -- Vérifier que le tenant existe
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
    RAISE EXCEPTION 'Tenant % does not exist', p_tenant_id;
  END IF;

  -- Vérifier que le rôle est valide
  IF p_role NOT IN ('admin', 'ceo', 'technician', 'secretary') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  -- Insérer ou mettre à jour le profil
  INSERT INTO profiles (
    id,
    tenant_id,
    email,
    full_name,
    role
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_email,
    p_full_name,
    p_role
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = p_tenant_id,
    full_name = p_full_name,
    role = p_role,
    updated_at = now();

  RETURN p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_user_to_tenant IS 'Ajoute un utilisateur à un tenant avec un rôle';

-- ============================================
-- FONCTION : Calculer l'usage du tenant (quotas)
-- ============================================

CREATE OR REPLACE FUNCTION get_tenant_usage(p_tenant_id uuid)
RETURNS TABLE(
  users_count integer,
  users_limit integer,
  interventions_this_month integer,
  interventions_limit integer,
  storage_mb numeric,
  storage_limit_mb integer,
  quota_exceeded boolean
) AS $$
DECLARE
  v_tenant tenants%ROWTYPE;
  v_users_count integer;
  v_interventions_count integer;
  v_storage_mb numeric := 0; -- TODO: calculer réellement
BEGIN
  -- Récupérer le tenant
  SELECT * INTO v_tenant FROM tenants WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not found', p_tenant_id;
  END IF;

  -- Compter les utilisateurs
  SELECT COUNT(*) INTO v_users_count
  FROM profiles
  WHERE tenant_id = p_tenant_id AND is_active = true;

  -- Compter les interventions du mois en cours
  SELECT COUNT(*) INTO v_interventions_count
  FROM interventions
  WHERE tenant_id = p_tenant_id
    AND scheduled_date >= date_trunc('month', CURRENT_DATE);

  -- Retourner les métriques
  RETURN QUERY SELECT
    v_users_count,
    v_tenant.max_users,
    v_interventions_count,
    v_tenant.max_interventions_per_month,
    v_storage_mb,
    v_tenant.max_storage_mb,
    (
      v_users_count >= v_tenant.max_users
      OR v_interventions_count >= v_tenant.max_interventions_per_month
      OR v_storage_mb >= v_tenant.max_storage_mb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_usage IS 'Retourne l''usage actuel du tenant vs quotas';

-- ============================================
-- FONCTION : Statistiques du tenant (dashboard CEO)
-- ============================================

CREATE OR REPLACE FUNCTION get_tenant_stats(p_tenant_id uuid)
RETURNS TABLE(
  total_clients integer,
  total_interventions integer,
  interventions_this_month integer,
  interventions_completed integer,
  revenue_this_month numeric,
  active_users integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::integer FROM clients WHERE tenant_id = p_tenant_id),
    (SELECT COUNT(*)::integer FROM interventions WHERE tenant_id = p_tenant_id),
    (SELECT COUNT(*)::integer FROM interventions
     WHERE tenant_id = p_tenant_id
       AND scheduled_date >= date_trunc('month', CURRENT_DATE)),
    (SELECT COUNT(*)::integer FROM interventions
     WHERE tenant_id = p_tenant_id
       AND status = 'completed'),
    (SELECT COALESCE(SUM(total_ttc), 0)
     FROM invoices
     WHERE tenant_id = p_tenant_id
       AND created_at >= date_trunc('month', CURRENT_DATE)),
    (SELECT COUNT(*)::integer FROM profiles
     WHERE tenant_id = p_tenant_id AND is_active = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_tenant_stats IS 'Statistiques globales du tenant pour le dashboard';

-- ============================================
-- FONCTION : Statistiques admin SaaS (tous les tenants)
-- ============================================

CREATE OR REPLACE FUNCTION get_saas_analytics()
RETURNS TABLE(
  total_tenants integer,
  active_tenants integer,
  trial_tenants integer,
  canceled_tenants integer,
  total_users integer,
  total_interventions_this_month integer,
  mrr numeric -- Monthly Recurring Revenue
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::integer FROM tenants),
    (SELECT COUNT(*)::integer FROM tenants WHERE subscription_status = 'active'),
    (SELECT COUNT(*)::integer FROM tenants WHERE subscription_status = 'trial'),
    (SELECT COUNT(*)::integer FROM tenants WHERE subscription_status = 'canceled'),
    (SELECT COUNT(*)::integer FROM profiles WHERE is_active = true),
    (SELECT COUNT(*)::integer FROM interventions
     WHERE scheduled_date >= date_trunc('month', CURRENT_DATE)),
    (SELECT COALESCE(SUM(
      CASE subscription_plan
        WHEN 'starter' THEN 29
        WHEN 'pro' THEN 79
        WHEN 'enterprise' THEN 199
        ELSE 0
      END
    ), 0)
    FROM tenants
    WHERE subscription_status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_saas_analytics IS 'Analytics globales SaaS (admin uniquement)';

-- ============================================
-- FONCTION : Gérer l'expiration des trials
-- ============================================

CREATE OR REPLACE FUNCTION expire_trials()
RETURNS integer AS $$
DECLARE
  v_expired_count integer;
BEGIN
  -- Passer les trials expirés en "canceled"
  UPDATE tenants
  SET
    subscription_status = 'canceled',
    canceled_at = now()
  WHERE subscription_status = 'trial'
    AND trial_ends_at < now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_trials IS 'Expire les périodes d''essai terminées (à exécuter quotidiennement via cron)';

-- ============================================
-- FONCTION : Mettre à jour le statut d'abonnement (webhook Stripe)
-- ============================================

CREATE OR REPLACE FUNCTION update_subscription_status(
  p_stripe_customer_id text,
  p_status text,
  p_stripe_subscription_id text DEFAULT NULL,
  p_plan text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Mettre à jour le statut d'abonnement
  UPDATE tenants
  SET
    subscription_status = p_status,
    stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
    subscription_plan = COALESCE(p_plan, subscription_plan),
    subscribed_at = CASE WHEN p_status = 'active' AND subscribed_at IS NULL THEN now() ELSE subscribed_at END,
    canceled_at = CASE WHEN p_status = 'canceled' THEN now() ELSE canceled_at END,
    updated_at = now()
  WHERE stripe_customer_id = p_stripe_customer_id
  RETURNING id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant with stripe_customer_id % not found', p_stripe_customer_id;
  END IF;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_subscription_status IS 'Met à jour le statut d''abonnement depuis un webhook Stripe';

-- ============================================
-- FONCTION : Upgrade de plan
-- ============================================

CREATE OR REPLACE FUNCTION upgrade_tenant_plan(
  p_tenant_id uuid,
  p_new_plan text
)
RETURNS void AS $$
DECLARE
  v_max_users integer;
  v_max_interventions integer;
  v_max_storage integer;
BEGIN
  -- Définir les limites selon le plan
  CASE p_new_plan
    WHEN 'starter' THEN
      v_max_users := 3;
      v_max_interventions := 50;
      v_max_storage := 1000; -- 1 Go
    WHEN 'pro' THEN
      v_max_users := 10;
      v_max_interventions := 200;
      v_max_storage := 5000; -- 5 Go
    WHEN 'enterprise' THEN
      v_max_users := 999; -- "illimité"
      v_max_interventions := 9999;
      v_max_storage := 20000; -- 20 Go
    ELSE
      RAISE EXCEPTION 'Invalid plan: %', p_new_plan;
  END CASE;

  -- Mettre à jour le tenant
  UPDATE tenants
  SET
    subscription_plan = p_new_plan,
    max_users = v_max_users,
    max_interventions_per_month = v_max_interventions,
    max_storage_mb = v_max_storage,
    updated_at = now()
  WHERE id = p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION upgrade_tenant_plan IS 'Upgrade le plan d''un tenant (met à jour les quotas)';

-- ============================================
-- VUE : Dashboard admin SaaS
-- ============================================

CREATE OR REPLACE VIEW admin_dashboard AS
SELECT
  t.id,
  t.company_name,
  t.slug,
  t.email,
  t.subscription_status,
  t.subscription_plan,
  t.created_at,
  t.trial_ends_at,
  COUNT(DISTINCT p.id) AS users_count,
  COUNT(DISTINCT i.id) AS interventions_count,
  COALESCE(SUM(inv.total_ttc), 0) AS total_revenue
FROM tenants t
LEFT JOIN profiles p ON t.id = p.tenant_id AND p.is_active = true
LEFT JOIN interventions i ON t.id = i.tenant_id
LEFT JOIN invoices inv ON t.id = inv.tenant_id
GROUP BY t.id;

COMMENT ON VIEW admin_dashboard IS 'Vue d''ensemble pour le dashboard admin SaaS';

-- ============================================
-- VALIDATION
-- ============================================

DO $$
BEGIN
  -- Vérifier que les fonctions existent
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_new_tenant'
  ) THEN
    RAISE EXCEPTION 'Function create_new_tenant was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_tenant_usage'
  ) THEN
    RAISE EXCEPTION 'Function get_tenant_usage was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_saas_analytics'
  ) THEN
    RAISE EXCEPTION 'Function get_saas_analytics was not created';
  END IF;

  RAISE NOTICE '✅ Migration 005: Fonctions helpers SaaS créées avec succès';
END $$;
