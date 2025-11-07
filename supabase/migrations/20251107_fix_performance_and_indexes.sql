-- ============================================
-- MIGRATION: Correction des performances et ajout d'index manquants
-- Date: 2025-11-07
-- Description: Résout les problèmes de lenteur et d'affichage des interventions
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- PARTIE 1: INDEX CRITIQUES SUR INTERVENTIONS
-- ============================================

-- Index sur scheduled_date (CRITIQUE pour le calendrier et dashboard)
CREATE INDEX IF NOT EXISTS idx_interventions_scheduled_date
ON interventions(scheduled_date);

-- Index sur status (utilisé dans presque toutes les requêtes)
CREATE INDEX IF NOT EXISTS idx_interventions_status
ON interventions(status);

-- Index composite pour les requêtes du dashboard "aujourd'hui"
-- Optimise: WHERE scheduled_date = X AND status IN ('scheduled', 'in_progress')
CREATE INDEX IF NOT EXISTS idx_interventions_scheduled_status
ON interventions(scheduled_date, status);

-- Index pour les interventions en attente
CREATE INDEX IF NOT EXISTS idx_interventions_on_hold
ON interventions(on_hold_at)
WHERE on_hold_at IS NOT NULL;

-- Index sur assigned_to pour filtrer par technicien
CREATE INDEX IF NOT EXISTS idx_interventions_assigned_to
ON interventions(assigned_to);

-- Index sur client_id pour les recherches par client
CREATE INDEX IF NOT EXISTS idx_interventions_client_id
ON interventions(client_id);

-- ============================================
-- PARTIE 2: INDEX SUR INTERVENTION_TYPES_JUNCTION
-- ============================================

-- Index sur intervention_id (CRITIQUE pour les jointures)
CREATE INDEX IF NOT EXISTS idx_intervention_types_junction_intervention_id
ON intervention_types_junction(intervention_id);

-- Index sur intervention_type pour filtrer par type
CREATE INDEX IF NOT EXISTS idx_intervention_types_junction_type
ON intervention_types_junction(intervention_type);

-- ============================================
-- PARTIE 3: INDEX SUR CLIENTS
-- ============================================

-- Index sur is_prospect (pour filtrer les prospects)
CREATE INDEX IF NOT EXISTS idx_clients_is_prospect
ON clients(is_prospect)
WHERE is_prospect = true;

-- Index sur last_name (pour la recherche de clients)
CREATE INDEX IF NOT EXISTS idx_clients_last_name
ON clients(last_name);

-- Index sur phone et mobile (pour éviter les doublons)
CREATE INDEX IF NOT EXISTS idx_clients_phone
ON clients(phone)
WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_mobile
ON clients(mobile)
WHERE mobile IS NOT NULL;

-- Index composite pour les prospects avec statut et date
CREATE INDEX IF NOT EXISTS idx_clients_prospect_status_date
ON clients(is_prospect, prospect_status_id, prospect_created_at)
WHERE is_prospect = true;

-- Index sur gcal_ical_uid pour la sync Google Calendar
CREATE INDEX IF NOT EXISTS idx_clients_gcal_ical_uid
ON clients(gcal_ical_uid)
WHERE gcal_ical_uid IS NOT NULL;

-- ============================================
-- PARTIE 4: INDEX SUR AUTRES TABLES
-- ============================================

-- Index sur email_logs pour retrouver les emails d'une intervention
CREATE INDEX IF NOT EXISTS idx_email_logs_intervention_id
ON email_logs(intervention_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_client_id
ON email_logs(client_id);

-- Index sur invoice pour retrouver les factures d'une intervention
CREATE INDEX IF NOT EXISTS idx_invoices_intervention_id
ON piscine_delmas_compta.invoices(intervention_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id
ON piscine_delmas_compta.invoices(client_id);

-- Index sur invoice status et dates
CREATE INDEX IF NOT EXISTS idx_invoices_status
ON piscine_delmas_compta.invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_issue_date
ON piscine_delmas_compta.invoices(issue_date);

-- ============================================
-- PARTIE 5: STATISTIQUES POUR L'OPTIMISEUR
-- ============================================

-- Mettre à jour les statistiques pour que PostgreSQL optimise mieux les requêtes
ANALYZE interventions;
ANALYZE intervention_types_junction;
ANALYZE clients;
ANALYZE email_logs;
ANALYZE piscine_delmas_compta.invoices;

-- ============================================
-- PARTIE 6: VÉRIFICATION DES INDEX
-- ============================================

DO $$
DECLARE
    missing_indexes text[] := ARRAY[]::text[];
    index_name text;
    index_count int;
BEGIN
    -- Vérifier les index critiques
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'piscine_delmas_public'
    AND tablename = 'interventions'
    AND indexname = 'idx_interventions_scheduled_date';

    IF index_count = 0 THEN
        missing_indexes := array_append(missing_indexes, 'idx_interventions_scheduled_date');
    END IF;

    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'piscine_delmas_public'
    AND tablename = 'interventions'
    AND indexname = 'idx_interventions_status';

    IF index_count = 0 THEN
        missing_indexes := array_append(missing_indexes, 'idx_interventions_status');
    END IF;

    IF array_length(missing_indexes, 1) > 0 THEN
        RAISE WARNING 'Indexes manquants: %', array_to_string(missing_indexes, ', ');
    ELSE
        RAISE NOTICE '✅ Tous les index critiques ont été créés avec succès!';
    END IF;

    -- Afficher le nombre total d'index créés
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE schemaname = 'piscine_delmas_public'
    AND indexname LIKE 'idx_%'
    AND indexname IN (
        'idx_interventions_scheduled_date',
        'idx_interventions_status',
        'idx_interventions_scheduled_status',
        'idx_interventions_on_hold',
        'idx_interventions_assigned_to',
        'idx_interventions_client_id',
        'idx_intervention_types_junction_intervention_id',
        'idx_intervention_types_junction_type',
        'idx_clients_is_prospect',
        'idx_clients_last_name',
        'idx_clients_phone',
        'idx_clients_mobile',
        'idx_clients_prospect_status_date',
        'idx_clients_gcal_ical_uid'
    );

    RAISE NOTICE '📊 Nombre d''index créés: % / 14', index_count;
END $$;

-- ============================================
-- PARTIE 7: COMMENTAIRES
-- ============================================

COMMENT ON INDEX idx_interventions_scheduled_date IS 'Optimise les requêtes de calendrier et dashboard par date';
COMMENT ON INDEX idx_interventions_status IS 'Optimise les filtres par statut (scheduled, in_progress, completed, etc.)';
COMMENT ON INDEX idx_interventions_scheduled_status IS 'Optimise les requêtes combinées date + statut (dashboard aujourd''hui)';
COMMENT ON INDEX idx_intervention_types_junction_intervention_id IS 'Optimise les jointures avec intervention_types_junction';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
