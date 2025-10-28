-- ============================================
-- MIGRATION: Correction de la table invoices
-- Date: 2025-10-28
-- Description: Ajoute la colonne tax_amount manquante dans la table invoices
-- ============================================

SET search_path TO piscine_delmas_compta;

-- Ajouter la colonne tax_amount si elle n'existe pas
-- Cette colonne est utilisée par les triggers/webhooks pour stocker le montant de la TVA
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) DEFAULT 0;

-- Si la colonne total_tva existe et contient des données, copier vers tax_amount
UPDATE invoices
SET tax_amount = COALESCE(total_tva, 0)
WHERE tax_amount IS NULL OR tax_amount = 0;

-- Commentaire sur la colonne
COMMENT ON COLUMN invoices.tax_amount IS 'Montant total de la TVA (synonyme de total_tva)';

-- Vérifier que la colonne a été créée
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'piscine_delmas_compta'
        AND table_name = 'invoices'
        AND column_name = 'tax_amount'
    ) THEN
        RAISE EXCEPTION 'Column invoices.tax_amount was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully! Column tax_amount was added to invoices table.';
END $$;
