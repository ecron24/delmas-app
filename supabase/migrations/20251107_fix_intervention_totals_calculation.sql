-- ============================================
-- MIGRATION: Calcul automatique des totaux d'intervention
-- Date: 2025-11-07
-- Description: Crée un trigger pour recalculer automatiquement les totaux
--              de l'intervention depuis intervention_items + main d'œuvre + déplacement
-- ============================================

SET search_path TO piscine_delmas_public;

-- ============================================
-- ÉTAPE 1: Créer la fonction de calcul des totaux
-- ============================================

CREATE OR REPLACE FUNCTION calculate_intervention_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piscine_delmas_public
AS $$
DECLARE
    v_intervention_id UUID;
    v_products_subtotal NUMERIC(10,2);
    v_products_tax NUMERIC(10,2);
    v_products_total NUMERIC(10,2);
    v_labor_total NUMERIC(10,2);
    v_travel_fee NUMERIC(10,2);
    v_final_subtotal NUMERIC(10,2);
    v_final_tax NUMERIC(10,2);
    v_final_total NUMERIC(10,2);
BEGIN
    -- Récupérer l'ID de l'intervention
    IF TG_OP = 'DELETE' THEN
        v_intervention_id := OLD.intervention_id;
    ELSE
        v_intervention_id := NEW.intervention_id;
    END IF;

    -- Si pas d'intervention, ne rien faire
    IF v_intervention_id IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
    END IF;

    -- 1️⃣ Calculer les totaux des produits depuis intervention_items
    SELECT
        COALESCE(SUM(quantity * unit_price), 0),
        COALESCE(SUM(quantity * unit_price * tva_rate / 100), 0),
        COALESCE(SUM(quantity * unit_price * (1 + tva_rate / 100)), 0)
    INTO
        v_products_subtotal,
        v_products_tax,
        v_products_total
    FROM intervention_items
    WHERE intervention_id = v_intervention_id;

    RAISE NOTICE '📦 Produits calculés - HT: %, TVA: %, TTC: %',
        v_products_subtotal, v_products_tax, v_products_total;

    -- 2️⃣ Récupérer main d'œuvre et frais de déplacement depuis l'intervention
    SELECT
        COALESCE(labor_total, 0),
        COALESCE(travel_fee, 0)
    INTO
        v_labor_total,
        v_travel_fee
    FROM interventions
    WHERE id = v_intervention_id;

    RAISE NOTICE '👷 Main d''œuvre: %, Déplacement: %', v_labor_total, v_travel_fee;

    -- 3️⃣ Calculer les totaux finaux
    -- Sous-total HT = Produits HT + Main d'œuvre + Déplacement
    v_final_subtotal := v_products_subtotal + v_labor_total + v_travel_fee;

    -- TVA = TVA des produits + TVA sur (Main d'œuvre + Déplacement)
    -- On suppose TVA 20% sur main d'œuvre et déplacement
    v_final_tax := v_products_tax + ((v_labor_total + v_travel_fee) * 0.20);

    -- Total TTC = Sous-total HT + TVA
    v_final_total := v_final_subtotal + v_final_tax;

    RAISE NOTICE '💰 TOTAUX FINAUX - HT: %, TVA: %, TTC: %',
        v_final_subtotal, v_final_tax, v_final_total;

    -- 4️⃣ Mettre à jour l'intervention avec les totaux calculés
    UPDATE interventions
    SET
        products_total = v_products_total,
        subtotal = v_final_subtotal,
        tax_amount = v_final_tax,
        total_ttc = v_final_total,
        updated_at = NOW()
    WHERE id = v_intervention_id;

    RAISE NOTICE '✅ Intervention % mise à jour avec totaux', v_intervention_id;

    -- Retourner la ligne appropriée
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ============================================
-- ÉTAPE 2: Créer le trigger sur intervention_items
-- ============================================

DROP TRIGGER IF EXISTS trg_calculate_intervention_totals ON intervention_items;

CREATE TRIGGER trg_calculate_intervention_totals
    AFTER INSERT OR UPDATE OR DELETE ON intervention_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_intervention_totals();

-- ============================================
-- ÉTAPE 3: Créer un trigger AVANT la création de proforma
-- ============================================

-- Ce trigger s'assure que les totaux sont calculés AVANT de créer la facture proforma
CREATE OR REPLACE FUNCTION ensure_intervention_totals_before_proforma()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = piscine_delmas_public
AS $$
DECLARE
    v_products_subtotal NUMERIC(10,2);
    v_products_tax NUMERIC(10,2);
    v_products_total NUMERIC(10,2);
    v_labor_total NUMERIC(10,2);
    v_travel_fee NUMERIC(10,2);
    v_final_subtotal NUMERIC(10,2);
    v_final_tax NUMERIC(10,2);
    v_final_total NUMERIC(10,2);
BEGIN
    -- Si le statut passe à 'completed', recalculer les totaux
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN

        RAISE NOTICE '🔄 Recalcul des totaux avant création proforma pour intervention %', NEW.id;

        -- 1️⃣ Calculer les totaux des produits
        SELECT
            COALESCE(SUM(quantity * unit_price), 0),
            COALESCE(SUM(quantity * unit_price * tva_rate / 100), 0),
            COALESCE(SUM(quantity * unit_price * (1 + tva_rate / 100)), 0)
        INTO
            v_products_subtotal,
            v_products_tax,
            v_products_total
        FROM intervention_items
        WHERE intervention_id = NEW.id;

        -- 2️⃣ Récupérer main d'œuvre et frais de déplacement
        v_labor_total := COALESCE(NEW.labor_total, 0);
        v_travel_fee := COALESCE(NEW.travel_fee, 0);

        -- 3️⃣ Calculer les totaux finaux
        v_final_subtotal := v_products_subtotal + v_labor_total + v_travel_fee;
        v_final_tax := v_products_tax + ((v_labor_total + v_travel_fee) * 0.20);
        v_final_total := v_final_subtotal + v_final_tax;

        -- 4️⃣ Mettre à jour NEW pour que les valeurs soient correctes
        NEW.products_total := v_products_total;
        NEW.subtotal := v_final_subtotal;
        NEW.tax_amount := v_final_tax;
        NEW.total_ttc := v_final_total;

        RAISE NOTICE '✅ Totaux recalculés - HT: %, TVA: %, TTC: %',
            v_final_subtotal, v_final_tax, v_final_total;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_totals_before_proforma ON interventions;

CREATE TRIGGER trg_ensure_totals_before_proforma
    BEFORE UPDATE OF status ON interventions
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
    EXECUTE FUNCTION ensure_intervention_totals_before_proforma();

-- ============================================
-- ÉTAPE 4: Recalculer les totaux pour toutes les interventions existantes
-- ============================================

DO $$
DECLARE
    v_intervention RECORD;
    v_products_subtotal NUMERIC(10,2);
    v_products_tax NUMERIC(10,2);
    v_products_total NUMERIC(10,2);
    v_labor_total NUMERIC(10,2);
    v_travel_fee NUMERIC(10,2);
    v_final_subtotal NUMERIC(10,2);
    v_final_tax NUMERIC(10,2);
    v_final_total NUMERIC(10,2);
BEGIN
    FOR v_intervention IN
        SELECT id, labor_total, travel_fee
        FROM interventions
        WHERE status IN ('in_progress', 'scheduled', 'completed')
    LOOP
        -- Calculer totaux produits
        SELECT
            COALESCE(SUM(quantity * unit_price), 0),
            COALESCE(SUM(quantity * unit_price * tva_rate / 100), 0),
            COALESCE(SUM(quantity * unit_price * (1 + tva_rate / 100)), 0)
        INTO
            v_products_subtotal,
            v_products_tax,
            v_products_total
        FROM intervention_items
        WHERE intervention_id = v_intervention.id;

        -- Récupérer main d'œuvre et déplacement
        v_labor_total := COALESCE(v_intervention.labor_total, 0);
        v_travel_fee := COALESCE(v_intervention.travel_fee, 0);

        -- Calculer totaux finaux
        v_final_subtotal := v_products_subtotal + v_labor_total + v_travel_fee;
        v_final_tax := v_products_tax + ((v_labor_total + v_travel_fee) * 0.20);
        v_final_total := v_final_subtotal + v_final_tax;

        -- Mettre à jour l'intervention
        UPDATE interventions
        SET
            products_total = v_products_total,
            subtotal = v_final_subtotal,
            tax_amount = v_final_tax,
            total_ttc = v_final_total,
            updated_at = NOW()
        WHERE id = v_intervention.id;
    END LOOP;

    RAISE NOTICE '✅ Totaux recalculés pour toutes les interventions existantes';
END $$;

-- ============================================
-- ÉTAPE 5: Vérification
-- ============================================

DO $$
DECLARE
    v_trigger_count INT;
BEGIN
    RAISE NOTICE '🔍 VÉRIFICATION DES TRIGGERS:';
    RAISE NOTICE '==========================================================';

    -- Vérifier trigger sur intervention_items
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'piscine_delmas_public'
    AND c.relname = 'intervention_items'
    AND t.tgname = 'trg_calculate_intervention_totals';

    IF v_trigger_count = 1 THEN
        RAISE NOTICE '✅ Trigger sur intervention_items créé';
    ELSE
        RAISE WARNING '⚠️ Trigger sur intervention_items manquant';
    END IF;

    -- Vérifier trigger sur interventions
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'piscine_delmas_public'
    AND c.relname = 'interventions'
    AND t.tgname = 'trg_ensure_totals_before_proforma';

    IF v_trigger_count = 1 THEN
        RAISE NOTICE '✅ Trigger BEFORE UPDATE sur interventions créé';
    ELSE
        RAISE WARNING '⚠️ Trigger BEFORE UPDATE sur interventions manquant';
    END IF;

    RAISE NOTICE '==========================================================';
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION calculate_intervention_totals() IS
    'Calcule automatiquement les totaux de l''intervention (subtotal, tax_amount, total_ttc)
    depuis intervention_items + labor_total + travel_fee.
    Déclenché par INSERT/UPDATE/DELETE sur intervention_items.';

COMMENT ON FUNCTION ensure_intervention_totals_before_proforma() IS
    'Recalcule les totaux de l''intervention AVANT le passage au statut "completed".
    Garantit que la facture proforma aura les bons montants.
    Déclenché AVANT UPDATE du statut à "completed".';

COMMENT ON TRIGGER trg_calculate_intervention_totals ON intervention_items IS
    'Recalcule les totaux de l''intervention quand un produit est ajouté/modifié/supprimé';

COMMENT ON TRIGGER trg_ensure_totals_before_proforma ON interventions IS
    'Garantit que les totaux sont corrects avant la création automatique de la facture proforma';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
