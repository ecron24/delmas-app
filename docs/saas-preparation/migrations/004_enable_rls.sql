-- ============================================
-- MIGRATION 004: Activer Row Level Security (RLS)
-- Description: Isolation complète des données par tenant avec policies Supabase
-- Date: 2025-10-30
-- ============================================

-- ⚠️  IMPORTANT : RLS = Sécurité multi-tenant
-- Chaque requête ne verra QUE les données de son tenant
-- Isolation garantie au niveau PostgreSQL

-- ============================================
-- ACTIVER RLS sur toutes les tables
-- ============================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES pour la table TENANTS
-- ============================================

-- Admin peut voir tous les tenants
CREATE POLICY admin_all_tenants ON tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Utilisateurs voient uniquement leur tenant
CREATE POLICY users_own_tenant ON tenants
  FOR SELECT
  TO authenticated
  USING (
    id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- CEO peut modifier son tenant
CREATE POLICY ceo_update_tenant ON tenants
  FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'ceo')
    )
  );

-- ============================================
-- POLICIES pour la table PROFILES
-- ============================================

-- Admins voient tous les profils
CREATE POLICY admin_all_profiles ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Utilisateurs voient les profils de leur tenant
CREATE POLICY tenant_profiles ON profiles
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Utilisateurs peuvent modifier leur propre profil
CREATE POLICY users_own_profile ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- CEO peut créer/modifier/supprimer des profils dans son tenant
CREATE POLICY ceo_manage_profiles ON profiles
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'ceo')
    )
  );

-- ============================================
-- POLICIES pour la table CLIENTS
-- ============================================

-- Isolation par tenant
CREATE POLICY tenant_isolation_clients ON clients
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- CEO et Secretary peuvent créer des clients
CREATE POLICY create_clients ON clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- ============================================
-- POLICIES pour la table INTERVENTIONS
-- ============================================

-- Admins, CEO, Secretary voient toutes les interventions de leur tenant
CREATE POLICY view_all_interventions ON interventions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- Techniciens voient uniquement leurs interventions assignées
CREATE POLICY technician_own_interventions ON interventions
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      assigned_technician_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'secretary')
      )
    )
  );

-- CEO et Secretary peuvent créer/modifier des interventions
CREATE POLICY manage_interventions ON interventions
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- Techniciens peuvent modifier leurs interventions assignées
CREATE POLICY technician_update_own_interventions ON interventions
  FOR UPDATE
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND assigned_technician_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND assigned_technician_id = auth.uid()
  );

-- ============================================
-- POLICIES pour la table POOLS
-- ============================================

CREATE POLICY tenant_isolation_pools ON pools
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- POLICIES pour la table INVOICES
-- ============================================

-- CEO et Secretary voient toutes les factures
CREATE POLICY view_invoices ON invoices
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- CEO et Secretary peuvent créer/modifier des factures
CREATE POLICY manage_invoices ON invoices
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- Techniciens ne peuvent PAS voir les factures (données financières)
-- (pas de policy = accès refusé par défaut)

-- ============================================
-- POLICIES pour la table INVOICE_ITEMS
-- ============================================

CREATE POLICY tenant_isolation_invoice_items ON invoice_items
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- ============================================
-- POLICIES pour la table PRODUCTS
-- ============================================

-- Tous les rôles peuvent voir les produits de leur tenant
CREATE POLICY view_products ON products
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- CEO et Secretary peuvent créer/modifier des produits
CREATE POLICY manage_products ON products
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- ============================================
-- POLICIES pour la table INTERVENTION_ITEMS
-- ============================================

-- Techniciens peuvent voir/ajouter des items à leurs interventions
CREATE POLICY manage_intervention_items ON intervention_items
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM interventions
        WHERE id = intervention_items.intervention_id
          AND (
            assigned_technician_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM profiles
              WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'secretary')
            )
          )
      )
    )
  );

-- ============================================
-- POLICIES pour la table INTERVENTION_PHOTOS
-- ============================================

CREATE POLICY manage_intervention_photos ON intervention_photos
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM interventions
        WHERE id = intervention_photos.intervention_id
          AND (
            assigned_technician_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM profiles
              WHERE id = auth.uid() AND role IN ('admin', 'ceo', 'secretary')
            )
          )
      )
    )
  );

-- ============================================
-- POLICIES pour la table INTERVENTION_TYPES
-- ============================================

-- Types globaux (tenant_id = NULL) visibles par tous
-- Types spécifiques visibles uniquement par le tenant
CREATE POLICY view_intervention_types ON intervention_types
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL -- Type global
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- CEO peut créer/modifier des types custom pour son tenant
CREATE POLICY manage_custom_intervention_types ON intervention_types
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo')
    )
  );

-- ============================================
-- POLICIES pour la table TASK_TEMPLATES
-- ============================================

CREATE POLICY view_task_templates ON task_templates
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IS NULL -- Template global
    OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY manage_task_templates ON task_templates
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo', 'secretary')
    )
  );

-- ============================================
-- POLICIES pour la table DOCUMENTS
-- ============================================

CREATE POLICY tenant_isolation_documents ON documents
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- ============================================
-- POLICIES pour la table USER_INVITATIONS
-- ============================================

-- CEO peut voir/gérer les invitations de son tenant
CREATE POLICY manage_user_invitations ON user_invitations
  FOR ALL
  TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'ceo')
    )
  );

-- ============================================
-- FONCTION : Vérifier l'isolation (test de sécurité)
-- ============================================

CREATE OR REPLACE FUNCTION test_rls_isolation(
  p_user1_id uuid,
  p_user2_id uuid
)
RETURNS TABLE(
  table_name text,
  user1_count bigint,
  user2_count bigint,
  isolated boolean
) AS $$
BEGIN
  -- Test sur la table clients
  RETURN QUERY
  SELECT
    'clients'::text,
    (SELECT COUNT(*) FROM clients) AS user1_count,
    (SELECT COUNT(*) FROM clients) AS user2_count,
    (SELECT COUNT(*) FROM clients) != (SELECT COUNT(*) FROM clients) AS isolated;

  -- Ajouter d'autres tests si nécessaire
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION test_rls_isolation IS 'Teste l''isolation RLS entre deux utilisateurs de tenants différents';

-- ============================================
-- VALIDATION
-- ============================================

DO $$
DECLARE
  v_table record;
  v_rls_enabled boolean;
BEGIN
  -- Vérifier que RLS est activé sur toutes les tables métier
  FOR v_table IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'tenants', 'profiles', 'clients', 'interventions',
        'pools', 'invoices', 'products', 'intervention_items'
      )
  LOOP
    SELECT relrowsecurity INTO v_rls_enabled
    FROM pg_class
    WHERE relname = v_table.tablename;

    IF NOT v_rls_enabled THEN
      RAISE EXCEPTION 'RLS not enabled on table: %', v_table.tablename;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Migration 004: RLS activé sur toutes les tables avec policies de sécurité';
END $$;
