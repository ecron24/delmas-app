-- ============================================
-- MIGRATION: Ajout du statut "en attente" pour les interventions
-- Date: 2025-10-28
-- Description: Permet aux techniciens de mettre une intervention en attente
--              avec une note explicative (manque d'eau, appareil défectueux, etc.)
-- ============================================

SET search_path TO piscine_delmas_public;

-- Ajouter une colonne pour stocker les notes de mise en attente
ALTER TABLE interventions
ADD COLUMN IF NOT EXISTS on_hold_reason text,
ADD COLUMN IF NOT EXISTS on_hold_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS on_hold_by uuid;

-- Créer un index sur les interventions en attente
CREATE INDEX IF NOT EXISTS idx_interventions_on_hold
ON interventions(on_hold_at)
WHERE on_hold_at IS NOT NULL;

-- Ajouter une contrainte pour s'assurer qu'on a une raison si mis en attente
ALTER TABLE interventions
ADD CONSTRAINT check_on_hold_reason
CHECK (
  (on_hold_at IS NULL AND on_hold_reason IS NULL) OR
  (on_hold_at IS NOT NULL AND on_hold_reason IS NOT NULL)
);

-- Commentaires
COMMENT ON COLUMN interventions.on_hold_reason IS 'Raison de la mise en attente (ex: manque d''eau, appareil défectueux, traitement en plusieurs fois)';
COMMENT ON COLUMN interventions.on_hold_at IS 'Date et heure de mise en attente';
COMMENT ON COLUMN interventions.on_hold_by IS 'ID du technicien ayant mis en attente';

-- Vérifier que les colonnes ont été créées
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'interventions' AND column_name = 'on_hold_reason') THEN
        RAISE EXCEPTION 'Column interventions.on_hold_reason was not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'piscine_delmas_public' AND table_name = 'interventions' AND column_name = 'on_hold_at') THEN
        RAISE EXCEPTION 'Column interventions.on_hold_at was not created';
    END IF;

    RAISE NOTICE 'Migration completed successfully! On-hold status columns added to interventions table.';
END $$;
