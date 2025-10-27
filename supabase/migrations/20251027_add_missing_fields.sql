-- ============================================
-- MIGRATION: Ajout des champs manquants
-- Date: 2025-10-27
-- Description: Ajoute les champs nécessaires pour l'app Next.js et sync Google Calendar
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- TABLE: clients
-- ============================================

-- Ajouter le type de client (particulier/professionnel)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS type text DEFAULT 'particulier' CHECK (type IN ('particulier', 'professionnel'));

-- Ajouter la raison sociale pour les professionnels
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS company_name text;

-- Ajouter le numéro de mobile (en plus du phone existant)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS mobile text;

-- Créer un index pour rechercher par company_name
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);

-- Créer un index pour rechercher par type
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(type);

-- ============================================
-- TABLE: interventions
-- ============================================

-- Ajouter la référence d'intervention (ex: INT-202410-123)
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS reference text;

-- Créer un index unique sur reference pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_reference ON interventions(reference);

-- Ajouter la description visible (vient de Google Calendar ou saisie technicien)
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS description text;

-- Ajouter les champs de facturation
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS labor_hours numeric(10,2);

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS labor_rate numeric(10,2);

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS travel_fee numeric(10,2) DEFAULT 0;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS total_ttc numeric(10,2) DEFAULT 0;

-- Ajouter les champs de synchronisation Google Calendar
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS gcal_event_id text;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS created_from text CHECK (created_from IN ('app', 'gcal'));

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS synced_to_gcal boolean DEFAULT false;

-- Créer un index unique sur gcal_event_id pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_interventions_gcal_event_id ON interventions(gcal_event_id) WHERE gcal_event_id IS NOT NULL;

-- Créer un index pour filtrer par source de création
CREATE INDEX IF NOT EXISTS idx_interventions_created_from ON interventions(created_from);

-- Ajouter les champs de complétion et signature
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS client_present boolean;

ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS client_signed_at timestamp with time zone;

-- Note: client_signature_url existe déjà comme 'signature_url' dans le schéma

-- Créer un index pour les interventions complétées
CREATE INDEX IF NOT EXISTS idx_interventions_completed_at ON interventions(completed_at);

-- ============================================
-- MIGRATION DES DONNÉES EXISTANTES
-- ============================================

-- Générer des références pour les interventions existantes qui n'en ont pas
DO $$
DECLARE
    intervention_record RECORD;
    new_reference text;
    counter integer := 1;
BEGIN
    FOR intervention_record IN
        SELECT id, scheduled_date
        FROM interventions
        WHERE reference IS NULL
        ORDER BY scheduled_date, created_at
    LOOP
        new_reference := 'INT-' || TO_CHAR(intervention_record.scheduled_date, 'YYYYMM') || '-' || LPAD(counter::text, 3, '0');

        UPDATE interventions
        SET reference = new_reference
        WHERE id = intervention_record.id;

        counter := counter + 1;
    END LOOP;
END $$;

-- Rendre le champ reference obligatoire maintenant que toutes les interventions en ont une
ALTER TABLE interventions
ALTER COLUMN reference SET NOT NULL;

-- Copier completion_date vers completed_at pour les interventions déjà complétées
UPDATE interventions
SET completed_at = completion_date
WHERE completion_date IS NOT NULL AND completed_at IS NULL;

-- Marquer les clients comme 'particulier' par défaut (déjà fait avec DEFAULT)
UPDATE clients
SET type = 'particulier'
WHERE type IS NULL;

-- ============================================
-- COMMENTAIRES SUR LES COLONNES
-- ============================================

COMMENT ON COLUMN clients.type IS 'Type de client: particulier ou professionnel';
COMMENT ON COLUMN clients.company_name IS 'Raison sociale pour les clients professionnels';
COMMENT ON COLUMN clients.mobile IS 'Numéro de téléphone mobile (en plus du phone fixe)';

COMMENT ON COLUMN interventions.reference IS 'Référence unique de l''intervention (ex: INT-202410-123)';
COMMENT ON COLUMN interventions.description IS 'Description visible de l''intervention (vient de Google Calendar ou saisie technicien)';
COMMENT ON COLUMN interventions.labor_hours IS 'Nombre d''heures de main d''œuvre';
COMMENT ON COLUMN interventions.labor_rate IS 'Taux horaire de main d''œuvre';
COMMENT ON COLUMN interventions.travel_fee IS 'Frais de déplacement';
COMMENT ON COLUMN interventions.total_ttc IS 'Montant total TTC de l''intervention';
COMMENT ON COLUMN interventions.gcal_event_id IS 'ID de l''événement Google Calendar associé';
COMMENT ON COLUMN interventions.created_from IS 'Source de création: app (application) ou gcal (Google Calendar)';
COMMENT ON COLUMN interventions.synced_to_gcal IS 'Indique si l''intervention a été synchronisée vers Google Calendar';
COMMENT ON COLUMN interventions.completed_at IS 'Date et heure de complétion de l''intervention';
COMMENT ON COLUMN interventions.client_present IS 'Indique si le client était présent lors de l''intervention';
COMMENT ON COLUMN interventions.client_signed_at IS 'Date et heure de la signature du client';

-- ============================================
-- VALIDATION
-- ============================================

-- Vérifier que tous les champs ont été ajoutés
DO $$
BEGIN
    -- Vérifier clients
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'clients' AND column_name = 'type') THEN
        RAISE EXCEPTION 'Column clients.type was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'clients' AND column_name = 'company_name') THEN
        RAISE EXCEPTION 'Column clients.company_name was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'clients' AND column_name = 'mobile') THEN
        RAISE EXCEPTION 'Column clients.mobile was not created';
    END IF;

    -- Vérifier interventions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'interventions' AND column_name = 'reference') THEN
        RAISE EXCEPTION 'Column interventions.reference was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'interventions' AND column_name = 'description') THEN
        RAISE EXCEPTION 'Column interventions.description was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'interventions' AND column_name = 'gcal_event_id') THEN
        RAISE EXCEPTION 'Column interventions.gcal_event_id was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully! All columns were added.';
END $$;
