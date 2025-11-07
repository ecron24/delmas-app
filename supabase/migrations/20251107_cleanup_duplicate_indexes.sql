-- ============================================
-- MIGRATION: Nettoyage des index en double
-- Date: 2025-11-07
-- Description: Supprime les index dupliqués détectés par le linter Supabase
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- SUPPRESSION DES INDEX EN DOUBLE
-- ============================================

-- 1. Table clients : Garder unique_client_reference (plus explicite)
DROP INDEX IF EXISTS clients_reference_key;

-- 2. Table intervention_types_junction : Garder le nouveau (plus explicite)
DROP INDEX IF EXISTS idx_intervention_types_junction_intervention;

-- 3. Table interventions : Garder les nouveaux (plus explicites)
DROP INDEX IF EXISTS idx_interventions_client;
DROP INDEX IF EXISTS idx_interventions_date;

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
    v_index_name TEXT;
    v_count INT;
    duplicate_indexes TEXT[] := ARRAY[
        'clients_reference_key',
        'idx_intervention_types_junction_intervention',
        'idx_interventions_client',
        'idx_interventions_date'
    ];
BEGIN
    RAISE NOTICE '🧹 VÉRIFICATION DU NETTOYAGE DES INDEX:';
    RAISE NOTICE '================================';

    FOREACH v_index_name IN ARRAY duplicate_indexes
    LOOP
        SELECT COUNT(*) INTO v_count
        FROM pg_indexes
        WHERE schemaname = 'piscine_delmas_public'
        AND indexname = v_index_name;

        IF v_count > 0 THEN
            RAISE WARNING '⚠️ Index % existe encore', v_index_name;
        ELSE
            RAISE NOTICE '✅ Index % supprimé', v_index_name;
        END IF;
    END LOOP;

    RAISE NOTICE '================================';
    RAISE NOTICE '✅ Nettoyage terminé!';

    -- Compter les index restants
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'piscine_delmas_public'
    AND indexname LIKE 'idx_%';

    RAISE NOTICE '📊 Index restants (idx_*): %', v_count;
END $$;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
