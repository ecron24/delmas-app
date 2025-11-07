-- ============================================
-- MIGRATION: Optimisation des politiques RLS sur prospect_status
-- Date: 2025-11-07
-- Description: Corrige le warning "Multiple Permissive Policies" du linter
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- SUPPRESSION DES ANCIENNES POLITIQUES
-- ============================================

-- Supprimer les 2 politiques existantes qui causent le problème
DROP POLICY IF EXISTS prospect_status_admin_write ON prospect_status;
DROP POLICY IF EXISTS prospect_status_read ON prospect_status;

-- ============================================
-- CRÉATION D'UNE SEULE POLITIQUE OPTIMISÉE
-- ============================================

-- Politique pour SELECT : Tout le monde peut lire
CREATE POLICY prospect_status_select_policy ON prospect_status
    FOR SELECT
    TO authenticated
    USING (true);

-- Politique pour INSERT/UPDATE/DELETE : Seulement les admins
CREATE POLICY prospect_status_write_policy ON prospect_status
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
    v_policy_count INT;
    v_policy_name TEXT;
BEGIN
    RAISE NOTICE '🔒 VÉRIFICATION DES POLITIQUES RLS:';
    RAISE NOTICE '================================';

    -- Compter les politiques SELECT sur prospect_status
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'piscine_delmas_public'
    AND tablename = 'prospect_status'
    AND cmd = 'SELECT';

    RAISE NOTICE '📊 Politiques SELECT sur prospect_status: %', v_policy_count;

    IF v_policy_count > 1 THEN
        RAISE WARNING '⚠️ Plusieurs politiques SELECT détectées (sous-optimal)';
    ELSIF v_policy_count = 1 THEN
        RAISE NOTICE '✅ Une seule politique SELECT (optimal)';
    ELSE
        RAISE WARNING '⚠️ Aucune politique SELECT (table non protégée)';
    END IF;

    -- Lister toutes les politiques
    RAISE NOTICE '================================';
    RAISE NOTICE '📋 Politiques actives:';

    FOR v_policy_name IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'piscine_delmas_public'
        AND tablename = 'prospect_status'
        ORDER BY policyname
    LOOP
        RAISE NOTICE '  • %', v_policy_name;
    END LOOP;

    RAISE NOTICE '================================';
    RAISE NOTICE '✅ Optimisation terminée!';
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON POLICY prospect_status_select_policy ON prospect_status IS
    'Permet à tous les utilisateurs authentifiés de lire les statuts prospects';

COMMENT ON POLICY prospect_status_write_policy ON prospect_status IS
    'Permet uniquement aux admins de modifier les statuts prospects';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
