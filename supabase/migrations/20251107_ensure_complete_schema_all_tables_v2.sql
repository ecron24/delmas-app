-- ============================================
-- MIGRATION CORRIGÉE: Compléter le schéma de toutes les tables auxiliaires
-- Date: 2025-11-07 (Version 2 - Correction pour données existantes)
-- Description: Ajoute les colonnes manquantes en gérant les données existantes
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- TABLE: profiles (utilisateurs)
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS id UUID;

-- Si id n'a pas de valeur par défaut, on l'ajoute
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'piscine_delmas_public'
        AND table_name = 'profiles'
        AND column_name = 'id'
        AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT;

-- Mettre à jour les rôles NULL
UPDATE profiles SET role = 'user' WHERE role IS NULL;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Mettre à jour les dates NULL
UPDATE profiles SET created_at = NOW() WHERE created_at IS NULL;
UPDATE profiles SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: technicians
-- ============================================

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS mobile TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

-- Mettre à jour is_active NULL
UPDATE technicians SET is_active = true WHERE is_active IS NULL;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Mettre à jour les dates NULL
UPDATE technicians SET created_at = NOW() WHERE created_at IS NULL;
UPDATE technicians SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: task_templates (modèles de tâches)
-- ============================================

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS tasks JSONB;

-- Mettre à jour tasks NULL
UPDATE task_templates SET tasks = '[]'::jsonb WHERE tasks IS NULL;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE task_templates SET created_at = NOW() WHERE created_at IS NULL;
UPDATE task_templates SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: pool_types (types de piscines)
-- ============================================

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE pool_types SET created_at = NOW() WHERE created_at IS NULL;

-- ============================================
-- TABLE: prospect_status (statuts prospects)
-- ============================================

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS color TEXT;

UPDATE prospect_status SET color = '#3b82f6' WHERE color IS NULL;

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS order_index INTEGER;

UPDATE prospect_status SET order_index = 0 WHERE order_index IS NULL;

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE prospect_status SET created_at = NOW() WHERE created_at IS NULL;

-- ============================================
-- TABLE: pricing_config (configuration tarifs)
-- ============================================

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS labor_rate NUMERIC(10,2);

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS travel_fee NUMERIC(10,2);

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS default_tva_rate NUMERIC(5,2);

UPDATE pricing_config SET default_tva_rate = 20 WHERE default_tva_rate IS NULL;

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS updated_by UUID;

UPDATE pricing_config SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: settings (paramètres généraux)
-- ============================================

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS key TEXT;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS value TEXT;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS updated_by UUID;

UPDATE settings SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: sync_metadata (métadonnées de synchronisation)
-- ⚠️ CORRECTION: Gérer les données existantes avec NULL
-- ============================================

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS entity_type TEXT;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS entity_id UUID;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS sync_status TEXT;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS sync_error TEXT;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ⚠️ NETTOYER LES DONNÉES EXISTANTES
-- Supprimer les lignes avec entity_type NULL (données invalides)
DELETE FROM sync_metadata WHERE entity_type IS NULL;

-- Ou alternative : Mettre une valeur par défaut
-- UPDATE sync_metadata SET entity_type = 'unknown' WHERE entity_type IS NULL;

UPDATE sync_metadata SET created_at = NOW() WHERE created_at IS NULL;
UPDATE sync_metadata SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: suppliers (fournisseurs)
-- ============================================

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

UPDATE suppliers SET is_active = true WHERE is_active IS NULL;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE suppliers SET created_at = NOW() WHERE created_at IS NULL;
UPDATE suppliers SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: product_categories (catégories produits)
-- ============================================

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS parent_id UUID;

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE product_categories SET created_at = NOW() WHERE created_at IS NULL;

-- ============================================
-- TABLE: products (produits)
-- ============================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS reference TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id UUID;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS supplier_id UUID;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC(5,2);

UPDATE products SET tva_rate = 20 WHERE tva_rate IS NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER;

UPDATE products SET stock_quantity = 0 WHERE stock_quantity IS NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER;

UPDATE products SET min_stock_alert = 0 WHERE min_stock_alert IS NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

UPDATE products SET is_active = true WHERE is_active IS NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE products SET created_at = NOW() WHERE created_at IS NULL;
UPDATE products SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================
-- TABLE: intervention_items (produits utilisés dans une intervention)
-- ============================================

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS intervention_id UUID;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS product_id UUID;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2);

UPDATE intervention_items SET quantity = 1 WHERE quantity IS NULL;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC(5,2);

UPDATE intervention_items SET tva_rate = 20 WHERE tva_rate IS NULL;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS total_ht NUMERIC(10,2);

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE intervention_items SET created_at = NOW() WHERE created_at IS NULL;

-- ============================================
-- TABLE: intervention_types_junction
-- ============================================

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS id UUID;

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS intervention_id UUID;

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS intervention_type TEXT;

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

UPDATE intervention_types_junction SET created_at = NOW() WHERE created_at IS NULL;

-- ============================================
-- INDEX UNIQUES POUR ÉVITER LES DOUBLONS
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_metadata_unique
ON sync_metadata(entity_type, entity_id)
WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_intervention_types_junction_unique
ON intervention_types_junction(intervention_id, intervention_type)
WHERE intervention_id IS NOT NULL AND intervention_type IS NOT NULL;

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
    table_name TEXT;
    column_count INT;
    tables_to_check TEXT[] := ARRAY[
        'profiles', 'technicians', 'task_templates', 'pool_types',
        'prospect_status', 'pricing_config', 'settings', 'sync_metadata',
        'suppliers', 'product_categories', 'products', 'intervention_items',
        'intervention_types_junction'
    ];
BEGIN
    RAISE NOTICE '📊 VÉRIFICATION DES TABLES:';
    RAISE NOTICE '================================';

    FOREACH table_name IN ARRAY tables_to_check
    LOOP
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns
        WHERE table_schema = 'piscine_delmas_public'
        AND table_name = table_name;

        RAISE NOTICE '✅ % : % colonnes', RPAD(table_name, 30), column_count;
    END LOOP;

    RAISE NOTICE '================================';
    RAISE NOTICE '✅ Migration terminée avec succès!';
END $$;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
