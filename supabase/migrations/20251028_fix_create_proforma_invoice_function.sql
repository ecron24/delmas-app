-- ============================================
-- MIGRATION: Correction de la fonction create_proforma_invoice
-- Date: 2025-10-28
-- Description: Corrige les noms de colonnes dans la fonction create_proforma_invoice
--              pour utiliser product_name au lieu de description, et subtotal au lieu de total
-- ============================================

SET search_path TO piscine_delmas_compta;

-- Recréer la fonction avec les bonnes colonnes
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

  -- Copier les lignes depuis intervention_items
  -- ⚠️ CORRECTION: product_name → description, subtotal → total
  INSERT INTO piscine_delmas_compta.invoice_items (
    invoice_id,
    description,
    quantity,
    unit_price,
    tva_rate,
    total
  )
  SELECT
    v_invoice_id,
    product_name,           -- ✅ Utiliser product_name au lieu de description
    quantity,
    unit_price,
    20,                     -- TVA par défaut 20%
    COALESCE(subtotal, quantity * unit_price)  -- ✅ Utiliser subtotal au lieu de total
  FROM piscine_delmas_public.intervention_items
  WHERE intervention_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Vérifier que la fonction a été créée
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.routines
        WHERE routine_schema = 'piscine_delmas_compta'
        AND routine_name = 'create_proforma_invoice'
    ) THEN
        RAISE EXCEPTION 'Function create_proforma_invoice was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully! Function create_proforma_invoice has been fixed.';
END $$;
