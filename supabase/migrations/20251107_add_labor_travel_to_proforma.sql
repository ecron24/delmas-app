-- ============================================
-- MIGRATION: Ajouter main d'œuvre et déplacement dans facture proforma
-- Date: 2025-11-07
-- Description: Modifie create_proforma_invoice() pour ajouter des lignes
--              pour la main d'œuvre et les frais de déplacement
-- ============================================

SET search_path TO piscine_delmas_compta;

-- ============================================
-- Recréer la fonction avec main d'œuvre + déplacement
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
  v_labor_hours NUMERIC;
  v_labor_rate NUMERIC;
  v_travel_fee NUMERIC;
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

  -- ✅ 1. Copier les PRODUITS depuis intervention_items
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
    COALESCE(tva_rate, 20)
  FROM piscine_delmas_public.intervention_items
  WHERE intervention_id = NEW.id;

  GET DIAGNOSTICS v_items_count = ROW_COUNT;
  RAISE NOTICE '📦 % produits copiés depuis intervention_items', v_items_count;

  -- ✅ 2. Ajouter une ligne pour la MAIN D'ŒUVRE (si elle existe)
  v_labor_hours := COALESCE(NEW.labor_hours, 0);
  v_labor_rate := COALESCE(NEW.labor_rate, 0);

  IF v_labor_hours > 0 AND v_labor_rate > 0 THEN
    -- Déterminer le type d'intervention pour le label
    DECLARE
      v_intervention_type TEXT;
      v_labor_description TEXT;
    BEGIN
      SELECT intervention_type INTO v_intervention_type
      FROM piscine_delmas_public.intervention_types_junction
      WHERE intervention_id = NEW.id
      LIMIT 1;

      -- Labels personnalisés selon le type
      v_labor_description := CASE v_intervention_type
        WHEN 'maintenance' THEN 'Main d''œuvre - Entretien'
        WHEN 'repair' THEN 'Main d''œuvre - Réparation'
        WHEN 'installation' THEN 'Main d''œuvre - Installation'
        WHEN 'winterization' THEN 'Main d''œuvre - Hivernage'
        WHEN 'startup' THEN 'Main d''œuvre - Remise en service'
        WHEN 'cleaning' THEN 'Main d''œuvre - Nettoyage'
        WHEN 'diagnostic' THEN 'Main d''œuvre - Diagnostic'
        WHEN 'emergency' THEN 'Main d''œuvre - Urgence'
        ELSE 'Main d''œuvre'
      END;

      INSERT INTO piscine_delmas_compta.invoice_items (
        invoice_id,
        description,
        quantity,
        unit_price,
        tva_rate
      ) VALUES (
        v_invoice_id,
        v_labor_description || ' (' || v_labor_hours || 'h)',
        v_labor_hours,
        v_labor_rate,
        20  -- TVA 20% sur main d'œuvre
      );

      RAISE NOTICE '👷 Main d''œuvre ajoutée: % × %€ = %€', v_labor_hours, v_labor_rate, (v_labor_hours * v_labor_rate);
    END;
  END IF;

  -- ✅ 3. Ajouter une ligne pour les FRAIS DE DÉPLACEMENT (si > 0)
  v_travel_fee := COALESCE(NEW.travel_fee, 0);

  IF v_travel_fee > 0 THEN
    INSERT INTO piscine_delmas_compta.invoice_items (
      invoice_id,
      description,
      quantity,
      unit_price,
      tva_rate
    ) VALUES (
      v_invoice_id,
      'Frais de déplacement',
      1,
      v_travel_fee,
      20  -- TVA 20% sur déplacement
    );

    RAISE NOTICE '🚗 Frais de déplacement ajoutés: %€', v_travel_fee;
  END IF;

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
        RAISE NOTICE '   • Copie les produits depuis intervention_items';
        RAISE NOTICE '   • ✨ NOUVEAU: Ajoute une ligne pour la main d''œuvre';
        RAISE NOTICE '   • ✨ NOUVEAU: Ajoute une ligne pour les frais de déplacement';
        RAISE NOTICE '   • Les totaux seront recalculés automatiquement';
    ELSE
        RAISE WARNING '⚠️ La fonction create_proforma_invoice() n''existe pas!';
    END IF;
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION create_proforma_invoice() IS
    'Crée automatiquement une facture proforma (draft) quand une intervention est terminée.
    Copie les produits depuis intervention_items ET ajoute des lignes pour :
    - La main d''œuvre (labor_hours × labor_rate)
    - Les frais de déplacement (travel_fee)
    Les totaux sont calculés automatiquement par les triggers.';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
