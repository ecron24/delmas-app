-- ============================================
-- MIGRATION: Corriger les totaux des factures dans la BDD
-- Date: 2025-11-10
-- Description: Recalculer les vrais totaux (labor + travel + produits)
--              et les enregistrer dans la table invoices
-- ============================================

SET search_path TO piscine_delmas_compta;

-- ============================================
-- 1. Recalculer tous les totaux des factures existantes
-- ============================================

DO $$
DECLARE
  v_invoice RECORD;
  v_intervention RECORD;
  v_labor_ht NUMERIC;
  v_labor_tva NUMERIC;
  v_travel_ht NUMERIC;
  v_travel_tva NUMERIC;
  v_products_ht NUMERIC;
  v_products_tva NUMERIC;
  v_subtotal_ht NUMERIC;
  v_total_tva NUMERIC;
  v_total_ttc NUMERIC;
BEGIN
  RAISE NOTICE '🔄 Début du recalcul des totaux pour toutes les factures...';

  -- Pour chaque facture
  FOR v_invoice IN
    SELECT id, intervention_id, invoice_number
    FROM piscine_delmas_compta.invoices
  LOOP
    RAISE NOTICE '📋 Traitement facture: %', v_invoice.invoice_number;

    -- Récupérer l'intervention associée
    SELECT labor_hours, labor_rate, travel_fee
    INTO v_intervention
    FROM piscine_delmas_public.interventions
    WHERE id = v_invoice.intervention_id;

    IF NOT FOUND THEN
      RAISE WARNING '⚠️ Intervention introuvable pour facture %', v_invoice.invoice_number;
      CONTINUE;
    END IF;

    -- ✅ 1. Calculer Main d'œuvre
    v_labor_ht := COALESCE(v_intervention.labor_hours, 0) * COALESCE(v_intervention.labor_rate, 0);
    v_labor_tva := v_labor_ht * 0.20;

    -- ✅ 2. Calculer Déplacement
    v_travel_ht := COALESCE(v_intervention.travel_fee, 0);
    v_travel_tva := v_travel_ht * 0.20;

    -- ✅ 3. Calculer Produits depuis invoice_items
    SELECT
      COALESCE(SUM(quantity * unit_price), 0),
      COALESCE(SUM(quantity * unit_price * tva_rate / 100), 0)
    INTO v_products_ht, v_products_tva
    FROM piscine_delmas_compta.invoice_items
    WHERE invoice_id = v_invoice.id;

    -- ✅ 4. Totaux
    v_subtotal_ht := v_labor_ht + v_travel_ht + v_products_ht;
    v_total_tva := v_labor_tva + v_travel_tva + v_products_tva;
    v_total_ttc := v_subtotal_ht + v_total_tva;

    -- ✅ 5. Mettre à jour la facture
    UPDATE piscine_delmas_compta.invoices
    SET
      subtotal_ht = v_subtotal_ht,
      total_tva = v_total_tva,
      tax_amount = v_total_tva,
      total_ttc = v_total_ttc
    WHERE id = v_invoice.id;

    RAISE NOTICE '✅ % : HT=%.2f€ | TVA=%.2f€ | TTC=%.2f€',
      v_invoice.invoice_number, v_subtotal_ht, v_total_tva, v_total_ttc;
  END LOOP;

  RAISE NOTICE '🎉 Recalcul terminé avec succès !';
END $$;

-- ============================================
-- 2. Vérification
-- ============================================

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM piscine_delmas_compta.invoices;

  RAISE NOTICE '📊 Nombre total de factures mises à jour: %', v_count;
END $$;
