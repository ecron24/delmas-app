-- ============================================
-- MIGRATION: Correction de la fonction sync_intervention_total_from_invoice
-- Date: 2025-11-07
-- Description: Corrige l'erreur "missing FROM-clause entry for table 'i'"
--              en supprimant les références incorrectes à l'alias 'i'
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- ÉTAPE 1: Supprimer l'ancien trigger et fonction
-- ============================================

DROP TRIGGER IF EXISTS trg_sync_intervention_total ON piscine_delmas_compta.invoice_items;
DROP FUNCTION IF EXISTS sync_intervention_total_from_invoice() CASCADE;

-- ============================================
-- ÉTAPE 2: Créer la fonction corrigée
-- ============================================

CREATE OR REPLACE FUNCTION sync_intervention_total_from_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piscine_delmas_public, piscine_delmas_compta
AS $$
DECLARE
    v_intervention_id UUID;
    v_subtotal_ht NUMERIC(10,2);
    v_total_tva NUMERIC(10,2);
    v_total_ttc NUMERIC(10,2);
BEGIN
    -- Récupérer l'ID de l'intervention concernée
    IF TG_OP = 'DELETE' THEN
        SELECT intervention_id INTO v_intervention_id
        FROM piscine_delmas_compta.invoices
        WHERE id = OLD.invoice_id;
    ELSE
        SELECT intervention_id INTO v_intervention_id
        FROM piscine_delmas_compta.invoices
        WHERE id = NEW.invoice_id;
    END IF;

    -- Si pas d'intervention liée, on ne fait rien
    IF v_intervention_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- ✅ CORRECTION: Calculer les totaux directement depuis invoice_items
    -- sans référencer d'alias 'i' non défini
    SELECT
        COALESCE(SUM(ii.quantity * ii.unit_price), 0),
        COALESCE(SUM(ii.quantity * ii.unit_price * ii.tva_rate / 100), 0),
        COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tva_rate / 100)), 0)
    INTO
        v_subtotal_ht,
        v_total_tva,
        v_total_ttc
    FROM piscine_delmas_compta.invoices inv
    LEFT JOIN piscine_delmas_compta.invoice_items ii ON ii.invoice_id = inv.id
    WHERE inv.intervention_id = v_intervention_id;

    -- Mettre à jour l'intervention avec les totaux de la facture
    UPDATE piscine_delmas_public.interventions
    SET
        subtotal = v_subtotal_ht,
        tax_amount = v_total_tva,
        total_ttc = v_total_ttc,
        updated_at = NOW()
    WHERE id = v_intervention_id;

    -- Retourner la ligne appropriée
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ============================================
-- ÉTAPE 3: Recréer le trigger
-- ============================================

CREATE TRIGGER trg_sync_intervention_total
    AFTER INSERT OR UPDATE OR DELETE ON piscine_delmas_compta.invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION piscine_delmas_public.sync_intervention_total_from_invoice();

-- ============================================
-- ÉTAPE 4: Recalculer les totaux pour toutes les interventions existantes
-- ============================================

DO $$
DECLARE
    v_intervention RECORD;
    v_subtotal_ht NUMERIC(10,2);
    v_total_tva NUMERIC(10,2);
    v_total_ttc NUMERIC(10,2);
BEGIN
    FOR v_intervention IN
        SELECT DISTINCT i.id
        FROM piscine_delmas_public.interventions i
        INNER JOIN piscine_delmas_compta.invoices inv ON inv.intervention_id = i.id
    LOOP
        -- Calculer les totaux depuis invoice_items
        SELECT
            COALESCE(SUM(ii.quantity * ii.unit_price), 0),
            COALESCE(SUM(ii.quantity * ii.unit_price * ii.tva_rate / 100), 0),
            COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tva_rate / 100)), 0)
        INTO
            v_subtotal_ht,
            v_total_tva,
            v_total_ttc
        FROM piscine_delmas_compta.invoices inv
        LEFT JOIN piscine_delmas_compta.invoice_items ii ON ii.invoice_id = inv.id
        WHERE inv.intervention_id = v_intervention.id;

        -- Mettre à jour l'intervention
        UPDATE piscine_delmas_public.interventions
        SET
            subtotal = v_subtotal_ht,
            tax_amount = v_total_tva,
            total_ttc = v_total_ttc,
            updated_at = NOW()
        WHERE id = v_intervention.id;
    END LOOP;

    RAISE NOTICE '✅ Totaux recalculés pour toutes les interventions avec factures';
END $$;

-- ============================================
-- ÉTAPE 5: Vérification
-- ============================================

DO $$
DECLARE
    v_trigger_count INT;
    v_function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔍 VÉRIFICATION DE LA CORRECTION:';
    RAISE NOTICE '==========================================================';

    -- Vérifier que le trigger existe
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'piscine_delmas_compta'
    AND c.relname = 'invoice_items'
    AND t.tgname = 'trg_sync_intervention_total';

    IF v_trigger_count = 1 THEN
        RAISE NOTICE '✅ Trigger recréé avec succès!';
        RAISE NOTICE '   • Table: piscine_delmas_compta.invoice_items';
        RAISE NOTICE '   • Événement: AFTER INSERT OR UPDATE OR DELETE';
        RAISE NOTICE '   • Action: Synchroniser les totaux de l''intervention';
    ELSE
        RAISE WARNING '⚠️ Le trigger n''a pas été créé correctement';
    END IF;

    -- Vérifier que la fonction existe
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'piscine_delmas_public'
        AND p.proname = 'sync_intervention_total_from_invoice'
    ) INTO v_function_exists;

    IF v_function_exists THEN
        RAISE NOTICE '✅ Fonction sync_intervention_total_from_invoice() corrigée';
        RAISE NOTICE '   • Suppression des références à l''alias ''i'' non défini';
        RAISE NOTICE '   • Calcul correct depuis invoice_items';
        RAISE NOTICE '   • Mise à jour de subtotal, tax_amount, total_ttc';
    ELSE
        RAISE WARNING '⚠️ La fonction sync_intervention_total_from_invoice() n''existe pas!';
    END IF;

    RAISE NOTICE '==========================================================';
    RAISE NOTICE '🎯 Comportement attendu:';
    RAISE NOTICE '   Quand on ajoute/modifie/supprime un produit dans invoice_items,';
    RAISE NOTICE '   l''intervention liée est automatiquement mise à jour avec les';
    RAISE NOTICE '   totaux calculés depuis la facture.';
    RAISE NOTICE '==========================================================';
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION piscine_delmas_public.sync_intervention_total_from_invoice() IS
    'Synchronise les totaux de l''intervention (subtotal, tax_amount, total_ttc) avec les totaux calculés depuis les invoice_items de la facture liée.
    Corrigé pour supprimer les références incorrectes à l''alias ''i'' non défini.';

COMMENT ON TRIGGER trg_sync_intervention_total ON piscine_delmas_compta.invoice_items IS
    'Trigger qui appelle sync_intervention_total_from_invoice() pour maintenir les totaux de l''intervention synchronisés avec la facture.';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
