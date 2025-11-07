-- ============================================
-- MIGRATION: S'assurer que la table interventions a toutes les colonnes nécessaires
-- Date: 2025-11-07
-- Description: Ajoute les colonnes manquantes si elles n'existent pas
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- COLONNES DE BASE
-- ============================================

-- ID et référence
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS reference TEXT NOT NULL;

-- Relation avec le client
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS client_id UUID NOT NULL REFERENCES clients(id);

-- Date et statut
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ NOT NULL;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled'
CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'invoiced'));

-- Technicien assigné
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES technicians(id);

-- Piscine concernée (optionnel)
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES client_pools(id);

-- Template de tâches (optionnel)
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS task_template_id UUID REFERENCES task_templates(id);

-- ============================================
-- COLONNES DE DESCRIPTION ET NOTES
-- ============================================

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============================================
-- COLONNES DE FACTURATION
-- ============================================

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS labor_hours NUMERIC(10,2);

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS labor_rate NUMERIC(10,2);

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS travel_fee NUMERIC(10,2) DEFAULT 0;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS total_ttc NUMERIC(10,2) DEFAULT 0;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS payment_status TEXT
CHECK (payment_status IN ('unpaid', 'paid', 'partially_paid', 'cancelled'));

-- ============================================
-- COLONNES DE SYNCHRONISATION GOOGLE CALENDAR
-- ============================================

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS gcal_event_id TEXT;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS created_from TEXT DEFAULT 'app'
CHECK (created_from IN ('app', 'gcal'));

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS synced_to_gcal BOOLEAN DEFAULT false;

-- ============================================
-- COLONNES DE COMPLÉTION ET SIGNATURE
-- ============================================

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS client_present BOOLEAN;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS client_signed_at TIMESTAMPTZ;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- ============================================
-- COLONNES DE GESTION EN ATTENTE (ON HOLD)
-- ============================================

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS on_hold_at TIMESTAMPTZ;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS on_hold_reason TEXT;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS on_hold_by UUID REFERENCES profiles(id);

-- ============================================
-- COLONNES D'AUDIT
-- ============================================

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ============================================
-- FONCTION TRIGGER POUR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur interventions
DROP TRIGGER IF EXISTS update_interventions_updated_at ON interventions;
CREATE TRIGGER update_interventions_updated_at
    BEFORE UPDATE ON interventions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
    column_count INT;
    required_columns TEXT[] := ARRAY[
        'id', 'reference', 'client_id', 'scheduled_date', 'status',
        'assigned_to', 'description', 'labor_hours', 'labor_rate',
        'travel_fee', 'total_ttc', 'gcal_event_id', 'created_from',
        'synced_to_gcal', 'completed_at', 'on_hold_at', 'on_hold_reason'
    ];
    col TEXT;
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOREACH col IN ARRAY required_columns
    LOOP
        SELECT COUNT(*) INTO column_count
        FROM information_schema.columns
        WHERE table_schema = 'piscine_delmas_public'
        AND table_name = 'interventions'
        AND column_name = col;

        IF column_count = 0 THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;

    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING '⚠️ Colonnes manquantes dans interventions: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ Toutes les colonnes requises existent dans la table interventions!';
    END IF;

    -- Compter le nombre total de colonnes
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_schema = 'piscine_delmas_public'
    AND table_name = 'interventions';

    RAISE NOTICE '📊 Nombre total de colonnes dans interventions: %', column_count;
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE interventions IS 'Table principale des interventions techniques';
COMMENT ON COLUMN interventions.scheduled_date IS 'Date et heure planifiée de l''intervention';
COMMENT ON COLUMN interventions.status IS 'Statut actuel: scheduled, in_progress, completed, cancelled, invoiced';
COMMENT ON COLUMN interventions.gcal_event_id IS 'ID de l''événement Google Calendar (si importé)';
COMMENT ON COLUMN interventions.created_from IS 'Source: app (créé manuellement) ou gcal (importé Google Calendar)';
COMMENT ON COLUMN interventions.on_hold_at IS 'Date de mise en attente de l''intervention';
COMMENT ON COLUMN interventions.on_hold_reason IS 'Raison de la mise en attente';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
