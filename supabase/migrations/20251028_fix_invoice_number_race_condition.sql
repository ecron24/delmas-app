-- ============================================
-- MIGRATION: Amélioration de create_proforma_invoice avec gestion des doublons
-- Date: 2025-10-28
-- Description: Ajoute un LOCK pour éviter les race conditions sur les numéros de facture
--              et améliore la gestion des doublons
-- ============================================

SET search_path TO piscine_delmas_compta;

-- Créer une table pour stocker la séquence des numéros de facture par année
CREATE TABLE IF NOT EXISTS invoice_number_sequences (
  year INT PRIMARY KEY,
  last_number INT NOT NULL DEFAULT 0
);

-- Fonction pour générer un numéro de facture unique de manière thread-safe
CREATE OR REPLACE FUNCTION generate_invoice_number(invoice_year INT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = piscine_delmas_compta
AS $$
DECLARE
  v_next_number INT;
  v_invoice_number TEXT;
BEGIN
  -- Utiliser un LOCK pour éviter les race conditions
  LOCK TABLE invoice_number_sequences IN SHARE ROW EXCLUSIVE MODE;

  -- Insérer ou mettre à jour la séquence pour cette année
  INSERT INTO invoice_number_sequences (year, last_number)
  VALUES (invoice_year, 1)
  ON CONFLICT (year)
  DO UPDATE SET last_number = invoice_number_sequences.last_number + 1
  RETURNING last_number INTO v_next_number;

  -- Générer le numéro de facture
  v_invoice_number := 'PRO-' || invoice_year::TEXT || '-' || LPAD(v_next_number::TEXT, 4, '0');

  RETURN v_invoice_number;
END;
$$;

-- Recréer la fonction create_proforma_invoice avec la nouvelle logique
CREATE OR REPLACE FUNCTION create_proforma_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = piscine_delmas_compta, piscine_delmas_public
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_year INT;
BEGIN
  -- Ne créer que si intervention terminée
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Vérifier si facture existe déjà (évite les doublons)
  IF EXISTS (
    SELECT 1 FROM piscine_delmas_compta.invoices
    WHERE intervention_id = NEW.id
  ) THEN
    RAISE NOTICE 'Facture déjà existante pour intervention %', NEW.id;
    RETURN NEW;
  END IF;

  -- Générer numéro de facture unique de manière thread-safe
  v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_invoice_number := generate_invoice_number(v_year);

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

  -- Copier les lignes depuis intervention_items si elles existent
  IF EXISTS (SELECT 1 FROM piscine_delmas_public.intervention_items WHERE intervention_id = NEW.id) THEN
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
      product_name,
      quantity,
      unit_price,
      20,
      COALESCE(subtotal, quantity * unit_price)
    FROM piscine_delmas_public.intervention_items
    WHERE intervention_id = NEW.id;
  END IF;

  RAISE NOTICE 'Facture proforma créée: % pour intervention %', v_invoice_number, NEW.reference;
  RETURN NEW;

EXCEPTION
  WHEN unique_violation THEN
    RAISE WARNING 'Conflit de numéro de facture détecté pour intervention %. Facture probablement déjà créée.', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la création de la facture proforma pour intervention %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Initialiser les séquences existantes
INSERT INTO invoice_number_sequences (year, last_number)
SELECT
  EXTRACT(YEAR FROM CURRENT_DATE)::INT,
  COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'PRO-[0-9]{4}-(\\d+)') AS INT)
  ), 0)
FROM piscine_delmas_compta.invoices
WHERE invoice_number ~ '^PRO-[0-9]{4}-[0-9]+'
ON CONFLICT (year) DO NOTHING;

COMMENT ON TABLE invoice_number_sequences IS 'Séquences pour générer les numéros de facture de manière thread-safe';
COMMENT ON FUNCTION generate_invoice_number IS 'Génère un numéro de facture unique pour une année donnée avec protection contre les race conditions';

-- Vérification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'piscine_delmas_compta'
        AND table_name = 'invoice_number_sequences'
    ) THEN
        RAISE EXCEPTION 'Table invoice_number_sequences was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully! Invoice number generation is now thread-safe.';
END $$;
