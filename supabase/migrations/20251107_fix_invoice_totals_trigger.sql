-- ============================================
-- MIGRATION: Correction du trigger de mise à jour des totaux de facture
-- Date: 2025-11-07
-- Description: Corrige l'erreur "missing FROM-clause entry for table 'i'"
--              en créant/corrigeant le trigger qui met à jour les totaux
--              de la table invoices quand on modifie invoice_items
-- ============================================

SET search_path TO piscine_delmas_compta;

-- ============================================
-- ÉTAPE 1: Supprimer les anciens triggers défectueux
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_invoice_totals ON invoice_items;
DROP TRIGGER IF EXISTS update_invoice_totals_trigger ON invoice_items;
DROP FUNCTION IF EXISTS update_invoice_totals() CASCADE;

-- ============================================
-- ÉTAPE 2: Créer la fonction correcte
-- ============================================

CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piscine_delmas_compta
AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal_ht NUMERIC(10,2);
    v_total_tva NUMERIC(10,2);
    v_total_ttc NUMERIC(10,2);
BEGIN
    -- Récupérer l'ID de la facture concernée
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- ✅ CORRECTION: Utiliser le bon alias dans la requête
    -- Calculer les totaux depuis invoice_items
    SELECT
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * unit_price * tva_rate / 100), 0),
        COALESCE(SUM(quantity * unit_price * (1 + tva_rate / 100)), 0)
    INTO
        v_subtotal_ht,
        v_total_tva,
        v_total_ttc
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;

    -- Mettre à jour la facture
    UPDATE invoices
    SET
        subtotal_ht = v_subtotal_ht,
        total_tva = v_total_tva,
        total_ttc = v_total_ttc,
        tax_amount = v_total_tva,  -- Synchroniser tax_amount avec total_tva
        updated_at = NOW()
    WHERE id = v_invoice_id;

    -- Retourner la ligne appropriée
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ============================================
-- ÉTAPE 3: Créer le trigger
-- ============================================

CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_totals();

-- ============================================
-- ÉTAPE 4: Recalculer tous les totaux existants
-- ============================================

-- Recalculer les totaux pour toutes les factures existantes
DO $$
DECLARE
    v_invoice RECORD;
    v_subtotal_ht NUMERIC(10,2);
    v_total_tva NUMERIC(10,2);
    v_total_ttc NUMERIC(10,2);
BEGIN
    FOR v_invoice IN SELECT id FROM invoices LOOP
        -- Calculer les totaux depuis invoice_items
        SELECT
            COALESCE(SUM(quantity * unit_price), 0),
            COALESCE(SUM(quantity * unit_price * tva_rate / 100), 0),
            COALESCE(SUM(quantity * unit_price * (1 + tva_rate / 100)), 0)
        INTO
            v_subtotal_ht,
            v_total_tva,
            v_total_ttc
        FROM invoice_items
        WHERE invoice_id = v_invoice.id;

        -- Mettre à jour la facture
        UPDATE invoices
        SET
            subtotal_ht = v_subtotal_ht,
            total_tva = v_total_tva,
            total_ttc = v_total_ttc,
            tax_amount = v_total_tva,
            updated_at = NOW()
        WHERE id = v_invoice.id;
    END LOOP;

    RAISE NOTICE '✅ Totaux recalculés pour toutes les factures existantes';
END $$;

-- ============================================
-- ÉTAPE 5: Vérification
-- ============================================

DO $$
DECLARE
    v_trigger_count INT;
    v_function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '🔍 VÉRIFICATION DU TRIGGER DE MISE À JOUR DES TOTAUX:';
    RAISE NOTICE '==========================================================';

    -- Vérifier que le trigger existe
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'piscine_delmas_compta'
    AND c.relname = 'invoice_items'
    AND t.tgname = 'trigger_update_invoice_totals';

    IF v_trigger_count = 1 THEN
        RAISE NOTICE '✅ Trigger créé avec succès!';
        RAISE NOTICE '   • Table: invoice_items';
        RAISE NOTICE '   • Événement: AFTER INSERT OR UPDATE OR DELETE';
        RAISE NOTICE '   • Action: Mise à jour automatique des totaux de la facture';
    ELSE
        RAISE WARNING '⚠️ Le trigger n''a pas été créé correctement';
    END IF;

    -- Vérifier que la fonction existe
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'piscine_delmas_compta'
        AND p.proname = 'update_invoice_totals'
    ) INTO v_function_exists;

    IF v_function_exists THEN
        RAISE NOTICE '✅ Fonction update_invoice_totals() existe';
    ELSE
        RAISE WARNING '⚠️ La fonction update_invoice_totals() n''existe pas!';
    END IF;

    RAISE NOTICE '==========================================================';
    RAISE NOTICE '🎯 Comportement attendu:';
    RAISE NOTICE '   Quand on ajoute/modifie/supprime un produit dans invoice_items,';
    RAISE NOTICE '   les totaux de la facture (subtotal_ht, total_tva, total_ttc)';
    RAISE NOTICE '   sont recalculés automatiquement.';
    RAISE NOTICE '==========================================================';
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION update_invoice_totals() IS
    'Recalcule automatiquement les totaux de la facture (subtotal_ht, total_tva, total_ttc) quand on modifie les invoice_items';

COMMENT ON TRIGGER trigger_update_invoice_totals ON invoice_items IS
    'Trigger qui appelle update_invoice_totals() pour maintenir les totaux à jour';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
