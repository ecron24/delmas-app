-- ============================================
-- MIGRATION 002: Créer la table profiles
-- Description: Utilisateurs avec rôles et liaison aux tenants
-- Date: 2025-10-30
-- ============================================

-- ============================================
-- TABLE: profiles (utilisateurs)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  -- Identifiant (lié à auth.users de Supabase)
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lien vers le tenant (entreprise)
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Informations personnelles
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,

  -- Rôle dans l'application
  role text NOT NULL DEFAULT 'technician' CHECK (
    role IN ('admin', 'ceo', 'technician', 'secretary')
  ),

  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz,
  is_active boolean DEFAULT true,

  -- Préférences utilisateur
  settings jsonb DEFAULT '{
    "language": "fr",
    "timezone": "Europe/Paris",
    "notifications_email": true,
    "notifications_push": false,
    "dashboard_view": "calendar"
  }'::jsonb,

  -- Métadonnées supplémentaires
  metadata jsonb DEFAULT '{}'::jsonb
);

-- ============================================
-- INDEX pour performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ============================================
-- TRIGGER pour updated_at automatique
-- ============================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMMENTAIRES sur les colonnes
-- ============================================

COMMENT ON TABLE profiles IS 'Profils utilisateurs avec rôles et liaison aux tenants';

COMMENT ON COLUMN profiles.id IS 'ID utilisateur (lié à auth.users)';
COMMENT ON COLUMN profiles.tenant_id IS 'Entreprise à laquelle appartient l''utilisateur';
COMMENT ON COLUMN profiles.role IS 'Rôle: admin (dev), ceo (propriétaire), technician (terrain), secretary (admin)';
COMMENT ON COLUMN profiles.email IS 'Email de l''utilisateur (copie depuis auth.users)';
COMMENT ON COLUMN profiles.is_active IS 'False si utilisateur désactivé par le CEO';
COMMENT ON COLUMN profiles.settings IS 'Préférences personnelles (langue, notifications, etc.)';

-- ============================================
-- FONCTION : Créer un profil automatiquement après signup
-- ============================================

CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est un signup via onboarding (tenant_id dans metadata)
  IF NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL THEN
    INSERT INTO profiles (
      id,
      tenant_id,
      email,
      full_name,
      role
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'tenant_id')::uuid,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'role', 'technician')
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur auth.users (Supabase Auth)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();

COMMENT ON FUNCTION create_profile_on_signup IS 'Crée automatiquement un profil après inscription Supabase Auth';

-- ============================================
-- FONCTION : Mettre à jour last_login_at
-- ============================================

CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET last_login_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Ce trigger doit être ajouté sur auth.users, mais Supabase ne permet pas
-- de modifier directement le schéma auth. On utilisera plutôt un appel API.

-- ============================================
-- VUE : Utilisateurs avec infos tenant (pour faciliter les queries)
-- ============================================

CREATE OR REPLACE VIEW user_profiles_with_tenant AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  p.phone,
  p.role,
  p.is_active,
  p.created_at,
  p.last_login_at,
  p.tenant_id,
  t.company_name,
  t.slug AS tenant_slug,
  t.subscription_status,
  t.subscription_plan
FROM profiles p
JOIN tenants t ON p.tenant_id = t.id;

COMMENT ON VIEW user_profiles_with_tenant IS 'Vue combinant profiles et infos tenant pour faciliter les queries';

-- ============================================
-- FONCTION : Vérifier les permissions par rôle
-- ============================================

CREATE OR REPLACE FUNCTION has_permission(
  p_user_id uuid,
  p_permission text
)
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO v_role FROM profiles WHERE id = p_user_id;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Matrice de permissions
  CASE p_permission
    -- Permissions admin (dev uniquement)
    WHEN 'access_admin_dashboard' THEN
      RETURN v_role = 'admin';

    WHEN 'manage_all_tenants' THEN
      RETURN v_role = 'admin';

    WHEN 'manage_webhooks' THEN
      RETURN v_role = 'admin';

    -- Permissions CEO
    WHEN 'manage_users' THEN
      RETURN v_role IN ('admin', 'ceo');

    WHEN 'manage_company_settings' THEN
      RETURN v_role IN ('admin', 'ceo');

    WHEN 'manage_subscription' THEN
      RETURN v_role IN ('admin', 'ceo');

    WHEN 'view_all_interventions' THEN
      RETURN v_role IN ('admin', 'ceo', 'secretary');

    WHEN 'view_financial_data' THEN
      RETURN v_role IN ('admin', 'ceo');

    -- Permissions Secretary
    WHEN 'create_clients' THEN
      RETURN v_role IN ('admin', 'ceo', 'secretary');

    WHEN 'create_invoices' THEN
      RETURN v_role IN ('admin', 'ceo', 'secretary');

    WHEN 'manage_calendar' THEN
      RETURN v_role IN ('admin', 'ceo', 'secretary');

    -- Permissions Technician
    WHEN 'view_own_interventions' THEN
      RETURN v_role IN ('admin', 'ceo', 'secretary', 'technician');

    WHEN 'update_intervention_status' THEN
      RETURN v_role IN ('admin', 'ceo', 'technician');

    WHEN 'capture_signature' THEN
      RETURN v_role IN ('admin', 'technician');

    ELSE
      -- Permission inconnue = refusée
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_permission IS 'Vérifie si un utilisateur a une permission donnée selon son rôle';

-- ============================================
-- FONCTION : Obtenir le tenant_id de l'utilisateur connecté
-- ============================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Récupérer depuis le contexte Supabase (set par le middleware)
  BEGIN
    v_tenant_id := current_setting('app.current_tenant_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- Si pas dans le contexte, essayer de récupérer depuis auth.uid()
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();
  END;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_tenant_id IS 'Retourne le tenant_id de l''utilisateur connecté';

-- ============================================
-- FONCTION : Obtenir le rôle de l'utilisateur connecté
-- ============================================

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  -- Récupérer le rôle depuis la table profiles
  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_user_role IS 'Retourne le rôle de l''utilisateur connecté';

-- ============================================
-- TABLE: user_invitations (pour inviter des utilisateurs)
-- ============================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant qui invite
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Utilisateur qui a créé l'invitation
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Email de la personne invitée
  email text NOT NULL,

  -- Rôle proposé
  role text NOT NULL CHECK (role IN ('technician', 'secretary', 'ceo')),

  -- Statut de l'invitation
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'expired', 'canceled')
  ),

  -- Token unique pour le lien d'invitation
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,

  -- Dates
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_id ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);

COMMENT ON TABLE user_invitations IS 'Invitations d''utilisateurs envoyées par le CEO';
COMMENT ON COLUMN user_invitations.token IS 'Token unique pour le lien d''invitation (envoyé par email)';
COMMENT ON COLUMN user_invitations.expires_at IS 'Date d''expiration (7 jours par défaut)';

-- ============================================
-- VALIDATION
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    RAISE EXCEPTION 'Table profiles was not created';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
    RAISE EXCEPTION 'Table user_invitations was not created';
  END IF;

  RAISE NOTICE '✅ Migration 002: Tables profiles et user_invitations créées avec succès';
END $$;
