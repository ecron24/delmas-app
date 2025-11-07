-- ============================================
-- MIGRATION V2: Nettoyage des index en double
-- Date: 2025-11-07
-- Description: Supprime les index dupliqués détectés par le linter Supabase
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- SUPPRESSION DES INDEX/CONTRAINTES EN DOUBLE
-- ============================================

-- 1. Table clients : clients_reference_key est une CONTRAINTE
-- Vérifier si unique_client_reference existe aussi
DO $$
BEGIN
    -- Supprimer la contrainte clients_reference_key si unique_client_reference existe
    IF EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'piscine_delmas_public'
        AND tablename = 'clients'
        AND indexname = 'unique_client_reference'
    ) THEN
        -- Supprimer la contrainte (pas juste l'index)
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_reference_key;
        RAISE NOTICE '✅ Contrainte clients_reference_key supprimée (doublon de unique_client_reference)';
    ELSE
        RAISE NOTICE '⚠️ Garde clients_reference_key (unique_client_reference n''existe pas)';
    END IF;
END $$;

-- 2. Table intervention_types_junction : Index simple (pas de contrainte)
DROP INDEX IF EXISTS idx_intervention_types_junction_intervention;

-- 3. Table interventions : Index simples (pas de contraintes)
DROP INDEX IF EXISTS idx_interventions_client;
DROP INDEX IF EXISTS idx_interventions_date;

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
    v_index_name TEXT;
    v_count INT;
    removed_indexes TEXT[] := ARRAY[
        'idx_intervention_types_junction_intervention',
        'idx_interventions_client',
        'idx_interventions_date'
    ];
BEGIN
    RAISE NOTICE '🧹 VÉRIFICATION DU NETTOYAGE DES INDEX:';
    RAISE NOTICE '================================';

    -- Vérifier clients_reference_key
    SELECT COUNT(*) INTO v_count
    FROM pg_constraint
    WHERE conname = 'clients_reference_key'
    AND connamespace = 'piscine_delmas_public'::regnamespace;

    IF v_count = 0 THEN
        RAISE NOTICE '✅ Contrainte clients_reference_key supprimée';
    ELSE
        RAISE NOTICE '⚠️ Contrainte clients_reference_key conservée (pas de doublon)';
    END IF;

    -- Vérifier les autres index
    FOREACH v_index_name IN ARRAY removed_indexes
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

    -- Compter les index restants sur les tables concernées
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'piscine_delmas_public'
    AND tablename IN ('clients', 'interventions', 'intervention_types_junction')
    AND indexname LIKE 'idx_%';

    RAISE NOTICE '📊 Index restants (idx_*) sur tables corrigées: %', v_count;
    RAISE NOTICE '✅ Nettoyage terminé!';
END $$;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
