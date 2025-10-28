-- ============================================
-- MIGRATION: Correction de la table invoice_items
-- Date: 2025-10-28
-- Description: Ajoute la colonne total manquante dans la table invoice_items
-- ============================================

SET search_path TO piscine_delmas_compta;

-- Ajouter la colonne total si elle n'existe pas
-- Cette colonne stocke le montant total de la ligne (quantity * unit_price)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS total numeric(10,2);

-- Calculer et remplir les totaux pour les lignes existantes
UPDATE invoice_items
SET total = quantity * unit_price
WHERE total IS NULL;

-- Créer un trigger pour calculer automatiquement le total à chaque insertion/mise à jour
CREATE OR REPLACE FUNCTION calculate_invoice_item_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Commentaire sur la colonne
COMMENT ON COLUMN invoice_items.total IS 'Montant total de la ligne (quantity * unit_price), calculé automatiquement';

-- Vérifier que la colonne a été créée
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'piscine_delmas_compta'
        AND table_name = 'invoice_items'
        AND column_name = 'total'
    ) THEN
        RAISE EXCEPTION 'Column invoice_items.total was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully! Column total was added to invoice_items table with auto-calculation trigger.';
END $$;
