-- ============================================
-- MIGRATION: Compléter le schéma de toutes les tables auxiliaires
-- Date: 2025-11-07
-- Description: Ajoute les colonnes manquantes dans toutes les tables
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- TABLE: profiles (utilisateurs)
-- ============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user'
CHECK (role IN ('admin', 'technician', 'user'));

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: technicians
-- ============================================

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS mobile TEXT;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE technicians
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: task_templates (modèles de tâches)
-- ============================================

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS tasks JSONB DEFAULT '[]'::jsonb;

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: pool_types (types de piscines)
-- ============================================

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE pool_types
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: prospect_status (statuts prospects)
-- ============================================

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

ALTER TABLE prospect_status
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: pricing_config (configuration tarifs)
-- ============================================

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS labor_rate NUMERIC(10,2);

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS travel_fee NUMERIC(10,2);

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS default_tva_rate NUMERIC(5,2) DEFAULT 20;

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE pricing_config
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- ============================================
-- TABLE: settings (paramètres généraux)
-- ============================================

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS key TEXT NOT NULL UNIQUE;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS value TEXT;

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE settings
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- ============================================
-- TABLE: sync_metadata (métadonnées de synchronisation)
-- ============================================

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS entity_id UUID NOT NULL;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS sync_status TEXT;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS sync_error TEXT;

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE sync_metadata
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: suppliers (fournisseurs)
-- ============================================

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: product_categories (catégories produits)
-- ============================================

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES product_categories(id);

ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: products (produits)
-- ============================================

ALTER TABLE products
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE products
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS reference TEXT;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC(5,2) DEFAULT 20;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS min_stock_alert INTEGER DEFAULT 0;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

ALTER TABLE products
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE products
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: intervention_items (produits utilisés dans une intervention)
-- ============================================

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS intervention_id UUID NOT NULL REFERENCES interventions(id);

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id);

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10,2) NOT NULL DEFAULT 1;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS tva_rate NUMERIC(5,2) DEFAULT 20;

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS total_ht NUMERIC(10,2);

ALTER TABLE intervention_items
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLE: intervention_types_junction
-- ============================================

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS intervention_id UUID NOT NULL REFERENCES interventions(id);

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS intervention_type TEXT NOT NULL
CHECK (intervention_type IN (
    'maintenance', 'repair', 'installation', 'diagnostic',
    'emergency', 'cleaning', 'winterization', 'startup', 'other'
));

ALTER TABLE intervention_types_junction
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- INDEX UNIQUES POUR ÉVITER LES DOUBLONS
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_metadata_unique
ON sync_metadata(entity_type, entity_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intervention_types_junction_unique
ON intervention_types_junction(intervention_id, intervention_type);

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
