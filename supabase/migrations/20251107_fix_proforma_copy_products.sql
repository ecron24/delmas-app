-- ============================================
-- MIGRATION: Correction copie des produits dans facture proforma
-- Date: 2025-11-07
-- Description: Corrige le trigger create_proforma_invoice() pour qu'il copie
--              correctement les produits depuis intervention_items avec le bon tva_rate
-- ============================================

SET search_path TO piscine_delmas_compta;

-- ============================================
-- Recréer la fonction avec les corrections
-- ============================================

CREATE OR REPLACE FUNCTION create_proforma_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = piscine_delmas_compta, piscine_delmas_public
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_year TEXT;
  v_next_number INT;
  v_items_count INT;
BEGIN
  -- Ne créer que si intervention terminée
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Vérifier si facture existe déjà
  IF EXISTS (
    SELECT 1 FROM piscine_delmas_compta.invoices
    WHERE intervention_id = NEW.id
  ) THEN
    RAISE NOTICE '⚠️ Facture déjà existante pour intervention %', NEW.id;
    RETURN NEW;
  END IF;

  -- Générer numéro de facture
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'PRO-' || v_year || '-(\\d+)') AS INT)
  ), 0) + 1
  INTO v_next_number
  FROM piscine_delmas_compta.invoices
  WHERE invoice_number LIKE 'PRO-' || v_year || '%';

  v_invoice_number := 'PRO-' || v_year || '-' || LPAD(v_next_number::TEXT, 4, '0');

  RAISE NOTICE '📋 Création facture proforma % pour intervention %', v_invoice_number, NEW.id;

  -- Créer facture proforma
  INSERT INTO piscine_delmas_compta.invoices (
    intervention_id,
    client_id,
    invoice_number,
    invoice_type,
    status,
    issue_date,
    due_date,
    subtotal_ht,
    tax_amount,
    total_ttc
  ) VALUES (
    NEW.id,
    NEW.client_id,
    v_invoice_number,
    'proforma',
    'draft',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    COALESCE(NEW.subtotal, 0),
    COALESCE(NEW.tax_amount, 0),
    COALESCE(NEW.total_ttc, 0)
  ) RETURNING id INTO v_invoice_id;

  RAISE NOTICE '✅ Facture créée avec ID: %', v_invoice_id;

  -- ✅ CORRECTION: Copier les lignes depuis intervention_items avec le bon tva_rate
  -- Ne PAS insérer 'total' car il est calculé automatiquement par le trigger calculate_invoice_item_total
  INSERT INTO piscine_delmas_compta.invoice_items (
    invoice_id,
    description,
    quantity,
    unit_price,
    tva_rate
  )
  SELECT
    v_invoice_id,
    product_name,
    quantity,
    unit_price,
    COALESCE(tva_rate, 20)  -- ✅ Utiliser tva_rate depuis intervention_items, ou 20% par défaut
  FROM piscine_delmas_public.intervention_items
  WHERE intervention_id = NEW.id;

  -- Vérifier combien de produits ont été copiés
  GET DIAGNOSTICS v_items_count = ROW_COUNT;
  RAISE NOTICE '📦 % produits copiés depuis intervention_items', v_items_count;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erreur création facture proforma: % %', SQLERRM, SQLSTATE;
    RETURN NEW;  -- Ne pas bloquer l'update de l'intervention
END;
$$;

-- ============================================
-- Vérification
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.routines
        WHERE routine_schema = 'piscine_delmas_compta'
        AND routine_name = 'create_proforma_invoice'
    ) THEN
        RAISE NOTICE '✅ Fonction create_proforma_invoice() mise à jour avec succès';
        RAISE NOTICE '   • Utilise tva_rate depuis intervention_items';
        RAISE NOTICE '   • Ne force plus total (calculé automatiquement)';
        RAISE NOTICE '   • Gestion d''erreur améliorée avec logs';
    ELSE
        RAISE WARNING '⚠️ La fonction create_proforma_invoice() n''existe pas!';
    END IF;
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION create_proforma_invoice() IS
    'Crée automatiquement une facture proforma (draft) quand une intervention est terminée.
    Copie les produits depuis intervention_items avec leur tva_rate.
    La colonne total est calculée automatiquement par le trigger calculate_invoice_item_total().';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
