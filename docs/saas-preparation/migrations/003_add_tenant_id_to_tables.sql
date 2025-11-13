-- ============================================
-- MIGRATION 003: Ajouter tenant_id aux tables métier
-- Description: Ajoute la colonne tenant_id à toutes les tables pour isolation multi-tenant
-- Date: 2025-10-30
-- ============================================

-- ============================================
-- AJOUTER tenant_id aux tables existantes
-- ============================================

-- Table clients
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);

COMMENT ON COLUMN clients.tenant_id IS 'Entreprise propriétaire du client';

-- Table interventions
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_interventions_tenant_id ON interventions(tenant_id);

COMMENT ON COLUMN interventions.tenant_id IS 'Entreprise propriétaire de l''intervention';

-- Table pools (piscines)
ALTER TABLE pools
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pools_tenant_id ON pools(tenant_id);

COMMENT ON COLUMN pools.tenant_id IS 'Entreprise propriétaire de la piscine';

-- Table invoices (factures)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);

COMMENT ON COLUMN invoices.tenant_id IS 'Entreprise propriétaire de la facture';

-- Table invoice_items (lignes de facture)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON invoice_items(tenant_id);

COMMENT ON COLUMN invoice_items.tenant_id IS 'Entreprise propriétaire de la ligne de facture';

-- Table products (produits/services)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);

COMMENT ON COLUMN products.tenant_id IS 'Entreprise propriétaire du produit';

-- Table intervention_items (produits/services d'une intervention)
ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_intervention_items_tenant_id ON intervention_items(tenant_id);

COMMENT ON COLUMN intervention_items.tenant_id IS 'Entreprise propriétaire de la ligne d''intervention';

-- Table intervention_types (types d'intervention)
-- Note: Cette table peut être partagée OU par tenant selon le besoin
ALTER TABLE intervention_types
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- NULL = type global (disponible pour tous), uuid = type spécifique au tenant
CREATE INDEX IF NOT EXISTS idx_intervention_types_tenant_id ON intervention_types(tenant_id);

COMMENT ON COLUMN intervention_types.tenant_id IS 'NULL = type global, sinon spécifique au tenant';

-- Table intervention_photos (photos d'intervention)
ALTER TABLE intervention_photos
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_intervention_photos_tenant_id ON intervention_photos(tenant_id);

COMMENT ON COLUMN intervention_photos.tenant_id IS 'Entreprise propriétaire de la photo';

-- Table task_templates (modèles de tâches)
ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_task_templates_tenant_id ON task_templates(tenant_id);

COMMENT ON COLUMN task_templates.tenant_id IS 'NULL = template global, sinon spécifique au tenant';

-- Table documents (documents attachés)
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents(tenant_id);

COMMENT ON COLUMN documents.tenant_id IS 'Entreprise propriétaire du document';

-- ============================================
-- AJOUTER assigned_technician_id (pour filtrage technicien)
-- ============================================

-- Si pas déjà présent, ajouter la colonne pour assigner un technicien
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS assigned_technician_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interventions_assigned_technician ON interventions(assigned_technician_id);

COMMENT ON COLUMN interventions.assigned_technician_id IS 'Technicien assigné à cette intervention (pour filtrage rôle technician)';

-- ============================================
-- FONCTION : Propager tenant_id automatiquement
-- ============================================

-- Fonction pour propager tenant_id depuis client → intervention
CREATE OR REPLACE FUNCTION propagate_tenant_id_from_client()
RETURNS TRIGGER AS $$
BEGIN
  -- Si intervention créée sans tenant_id, le récupérer depuis le client
  IF NEW.tenant_id IS NULL AND NEW.client_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM clients
    WHERE id = NEW.client_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS propagate_tenant_id_on_intervention ON interventions;
CREATE TRIGGER propagate_tenant_id_on_intervention
  BEFORE INSERT ON interventions
  FOR EACH ROW
  EXECUTE FUNCTION propagate_tenant_id_from_client();

-- Fonction pour propager tenant_id depuis intervention → invoice
CREATE OR REPLACE FUNCTION propagate_tenant_id_from_intervention()
RETURNS TRIGGER AS $$
BEGIN
  -- Si facture créée sans tenant_id, le récupérer depuis l'intervention
  IF NEW.tenant_id IS NULL AND NEW.intervention_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM interventions
    WHERE id = NEW.intervention_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS propagate_tenant_id_on_invoice ON invoices;
CREATE TRIGGER propagate_tenant_id_on_invoice
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION propagate_tenant_id_from_intervention();

-- Fonction pour propager tenant_id depuis intervention → intervention_items
CREATE OR REPLACE FUNCTION propagate_tenant_id_to_intervention_items()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL AND NEW.intervention_id IS NOT NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM interventions
    WHERE id = NEW.intervention_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS propagate_tenant_id_on_intervention_item ON intervention_items;
CREATE TRIGGER propagate_tenant_id_on_intervention_item
  BEFORE INSERT ON intervention_items
  FOR EACH ROW
  EXECUTE FUNCTION propagate_tenant_id_to_intervention_items();

-- ============================================
-- CONTRAINTE : tenant_id cohérent dans les relations
-- ============================================

-- Fonction de validation : l'intervention doit appartenir au même tenant que le client
CREATE OR REPLACE FUNCTION check_intervention_tenant_matches_client()
RETURNS TRIGGER AS $$
DECLARE
  v_client_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_client_tenant_id
  FROM clients
  WHERE id = NEW.client_id;

  IF v_client_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Client % does not exist', NEW.client_id;
  END IF;

  IF NEW.tenant_id IS NOT NULL AND NEW.tenant_id != v_client_tenant_id THEN
    RAISE EXCEPTION 'Intervention tenant_id (%) does not match client tenant_id (%)',
      NEW.tenant_id, v_client_tenant_id;
  END IF;

  -- Forcer le tenant_id du client si NULL
  NEW.tenant_id := v_client_tenant_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_intervention_tenant ON interventions;
CREATE TRIGGER validate_intervention_tenant
  BEFORE INSERT OR UPDATE ON interventions
  FOR EACH ROW
  EXECUTE FUNCTION check_intervention_tenant_matches_client();

-- ============================================
-- MIGRATION DES DONNÉES EXISTANTES (si besoin)
-- ============================================

-- Si vous migrez depuis delmas-app mono-tenant, vous pouvez :
-- 1. Créer un tenant "Delmas Piscines"
-- 2. Assigner toutes les données à ce tenant

-- Exemple (à adapter selon vos besoins) :
/*
DO $$
DECLARE
  v_delmas_tenant_id uuid;
BEGIN
  -- Créer le tenant Delmas (si migration depuis delmas-app)
  INSERT INTO tenants (
    company_name,
    slug,
    email,
    subscription_status,
    subscription_plan,
    onboarding_completed
  ) VALUES (
    'Delmas Piscines',
    'delmas-piscines',
    'stephanedelmas69@gmail.com',
    'active',
    'pro',
    true
  )
  RETURNING id INTO v_delmas_tenant_id;

  -- Assigner toutes les données existantes à Delmas
  UPDATE clients SET tenant_id = v_delmas_tenant_id WHERE tenant_id IS NULL;
  UPDATE interventions SET tenant_id = v_delmas_tenant_id WHERE tenant_id IS NULL;
  UPDATE pools SET tenant_id = v_delmas_tenant_id WHERE tenant_id IS NULL;
  UPDATE invoices SET tenant_id = v_delmas_tenant_id WHERE tenant_id IS NULL;
  UPDATE invoice_items SET tenant_id = v_delmas_tenant_id WHERE tenant_id IS NULL;
  UPDATE products SET tenant_id = v_delmas_tenant_id WHERE tenant_id IS NULL;
  UPDATE intervention_items SET tenant_id = v_delmas_tenant_id WHERE tenant_id IS NULL;

  RAISE NOTICE '✅ Toutes les données migrées vers tenant Delmas: %', v_delmas_tenant_id;
END $$;
*/

-- ============================================
-- RENDRE tenant_id OBLIGATOIRE (après migration)
-- ============================================

-- Décommenter après avoir migré les données existantes
/*
ALTER TABLE clients ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE interventions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE pools ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE invoice_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE intervention_items ALTER COLUMN tenant_id SET NOT NULL;
*/

-- ============================================
-- VALIDATION
-- ============================================

DO $$
BEGIN
  -- Vérifier que tenant_id a été ajouté
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'tenant_id'
  ) THEN
    RAISE EXCEPTION 'Column clients.tenant_id was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'interventions' AND column_name = 'tenant_id'
  ) THEN
    RAISE EXCEPTION 'Column interventions.tenant_id was not created';
  END IF;

  RAISE NOTICE '✅ Migration 003: tenant_id ajouté à toutes les tables métier';
END $$;
