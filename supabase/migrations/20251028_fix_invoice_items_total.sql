-- ============================================
-- MIGRATION: Correction de la table invoice_items
-- Date: 2025-10-28
-- Description: Ajoute toutes les colonnes manquantes dans la table invoice_items
--              (description, quantity, unit_price, tva_rate, total)
-- ============================================

SET search_path TO piscine_delmas_compta;

-- Ajouter les colonnes manquantes dans invoice_items
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS quantity numeric(10,2) DEFAULT 1,
ADD COLUMN IF NOT EXISTS unit_price numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tva_rate numeric(5,2) DEFAULT 20,
ADD COLUMN IF NOT EXISTS total numeric(10,2);

-- Calculer et remplir les totaux pour les lignes existantes
UPDATE invoice_items
SET total = quantity * unit_price
WHERE total IS NULL;

-- Créer un trigger pour calculer automatiquement le total à chaque insertion/mise à jour
CREATE OR REPLACE FUNCTION calculate_invoice_item_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = piscine_delmas_compta
AS $$
BEGIN
    NEW.total = NEW.quantity * NEW.unit_price;
    RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_calculate_invoice_item_total ON invoice_items;

-- Créer le trigger
CREATE TRIGGER trigger_calculate_invoice_item_total
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_item_total();

-- Commentaires sur les colonnes
COMMENT ON COLUMN invoice_items.description IS 'Description de la ligne de facture';
COMMENT ON COLUMN invoice_items.quantity IS 'Quantité';
COMMENT ON COLUMN invoice_items.unit_price IS 'Prix unitaire HT';
COMMENT ON COLUMN invoice_items.tva_rate IS 'Taux de TVA (en pourcentage)';
COMMENT ON COLUMN invoice_items.total IS 'Montant total de la ligne (quantity * unit_price), calculé automatiquement';

-- Vérifier que toutes les colonnes ont été créées
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_compta' AND table_name = 'invoice_items' AND column_name = 'description') THEN
        RAISE EXCEPTION 'Column invoice_items.description was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_compta' AND table_name = 'invoice_items' AND column_name = 'quantity') THEN
        RAISE EXCEPTION 'Column invoice_items.quantity was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_compta' AND table_name = 'invoice_items' AND column_name = 'unit_price') THEN
        RAISE EXCEPTION 'Column invoice_items.unit_price was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_compta' AND table_name = 'invoice_items' AND column_name = 'tva_rate') THEN
        RAISE EXCEPTION 'Column invoice_items.tva_rate was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_compta' AND table_name = 'invoice_items' AND column_name = 'total') THEN
        RAISE EXCEPTION 'Column invoice_items.total was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully! All columns added to invoice_items table with auto-calculation trigger.';
END $$;
