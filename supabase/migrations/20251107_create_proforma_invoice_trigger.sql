-- ============================================
-- MIGRATION: Création du trigger pour facture proforma automatique
-- Date: 2025-11-07
-- Description: Crée le trigger manquant qui appelle create_proforma_invoice()
--              quand une intervention passe en statut 'completed'
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- SUPPRESSION DU TRIGGER S'IL EXISTE
-- ============================================

DROP TRIGGER IF EXISTS trigger_create_proforma_invoice ON interventions;

-- ============================================
-- CRÉATION DU TRIGGER
-- ============================================

-- ✅ Ce trigger appelle la fonction create_proforma_invoice() automatiquement
-- quand une intervention passe en statut 'completed'
CREATE TRIGGER trigger_create_proforma_invoice
    AFTER UPDATE OF status ON interventions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION piscine_delmas_compta.create_proforma_invoice();

-- ============================================
-- VÉRIFICATION
-- ============================================

DO $$
DECLARE
    v_trigger_count INT;
BEGIN
    RAISE NOTICE '🧾 VÉRIFICATION DU TRIGGER FACTURE PROFORMA:';
    RAISE NOTICE '==============================================';

    -- Vérifier que le trigger existe
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'piscine_delmas_public'
    AND c.relname = 'interventions'
    AND t.tgname = 'trigger_create_proforma_invoice';

    IF v_trigger_count = 1 THEN
        RAISE NOTICE '✅ Trigger créé avec succès!';
        RAISE NOTICE '   • Table: interventions';
        RAISE NOTICE '   • Événement: AFTER UPDATE OF status';
        RAISE NOTICE '   • Condition: NEW.status = completed';
        RAISE NOTICE '   • Action: Création facture proforma automatique';
    ELSE
        RAISE WARNING '⚠️ Le trigger n''a pas été créé correctement';
    END IF;

    -- Vérifier que la fonction existe
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'piscine_delmas_compta'
        AND p.proname = 'create_proforma_invoice'
    ) THEN
        RAISE NOTICE '✅ Fonction create_proforma_invoice() existe';
    ELSE
        RAISE WARNING '⚠️ La fonction create_proforma_invoice() n''existe pas!';
        RAISE WARNING '   → Vérifiez que la migration 20251028_fix_create_proforma_invoice_function.sql a été appliquée';
    END IF;

    RAISE NOTICE '==============================================';
    RAISE NOTICE '🎯 Comportement attendu:';
    RAISE NOTICE '   Quand une intervention passe en status "completed",';
    RAISE NOTICE '   une facture proforma sera créée automatiquement avec:';
    RAISE NOTICE '   • Numéro: PRO-YYYY-XXXX';
    RAISE NOTICE '   • Type: proforma';
    RAISE NOTICE '   • Status: draft (modifiable)';
    RAISE NOTICE '==============================================';
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TRIGGER trigger_create_proforma_invoice ON interventions IS
    'Crée automatiquement une facture proforma quand l''intervention est terminée. La facture est en mode draft pour permettre les modifications avant validation.';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
