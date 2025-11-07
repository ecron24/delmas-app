-- ============================================
-- MIGRATION: Correction sécurité fonction update_updated_at_column
-- Date: 2025-11-07
-- Description: Corrige le warning "Function Search Path Mutable" du linter
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- RECRÉATION DE LA FONCTION AVEC search_path
-- ============================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recréer avec search_path explicite et SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piscine_delmas_public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Ajouter un commentaire
COMMENT ON FUNCTION update_updated_at_column() IS
    'Trigger function pour mettre à jour automatiquement updated_at. Sécurisé avec search_path explicite.';

-- ============================================
-- RECRÉER LES TRIGGERS SUR LES TABLES
-- ============================================

-- Trigger sur interventions
DROP TRIGGER IF EXISTS update_interventions_updated_at ON interventions;
CREATE TRIGGER update_interventions_updated_at
    BEFORE UPDATE ON interventions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Si vous avez d'autres tables avec ce trigger, ajoutez-les ici
-- Exemple pour clients (si existe)
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
    v_prosecdef TEXT;
    v_proconfig TEXT[];
BEGIN
    RAISE NOTICE '🔒 VÉRIFICATION DE LA FONCTION:';
    RAISE NOTICE '================================';

    -- Vérifier les attributs de sécurité de la fonction
    SELECT
        CASE WHEN prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END,
        proconfig
    INTO v_prosecdef, v_proconfig
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
    AND pronamespace = 'piscine_delmas_public'::regnamespace;

    RAISE NOTICE '📊 Mode sécurité: %', v_prosecdef;
    RAISE NOTICE '📊 search_path configuré: %', v_proconfig;

    IF v_proconfig IS NOT NULL THEN
        RAISE NOTICE '✅ search_path défini (sécurisé)';
    ELSE
        RAISE WARNING '⚠️ search_path non défini (risque de sécurité)';
    END IF;

    -- Lister les triggers utilisant cette fonction
    RAISE NOTICE '================================';
    RAISE NOTICE '📋 Triggers actifs:';

    FOR v_prosecdef IN
        SELECT tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'piscine_delmas_public'
        AND tgname LIKE '%updated_at%'
        ORDER BY tgname
    LOOP
        RAISE NOTICE '  • %', v_prosecdef;
    END LOOP;

    RAISE NOTICE '================================';
    RAISE NOTICE '✅ Fonction sécurisée!';
END $$;

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
