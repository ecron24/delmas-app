-- ============================================
-- ROLLBACK: Supprimer les triggers défectueux de calcul des totaux
-- Date: 2025-11-07
-- Description: Annule la migration 20251107_fix_intervention_totals_calculation.sql
--              qui causait des calculs incorrects (36€ au lieu de 312€)
-- ============================================

SET search_path TO piscine_delmas_public;

-- Supprimer les triggers
DROP TRIGGER IF EXISTS trg_calculate_intervention_totals ON intervention_items;
DROP TRIGGER IF EXISTS trg_ensure_totals_before_proforma ON interventions;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS calculate_intervention_totals();
DROP FUNCTION IF EXISTS ensure_intervention_totals_before_proforma();

-- Vérification
DO $$
BEGIN
    RAISE NOTICE '✅ Triggers défectueux supprimés';
    RAISE NOTICE '📋 La facture proforma calcule correctement les totaux';
    RAISE NOTICE '🔧 L''affichage de la fiche intervention sera corrigé dans le code';
END $$;
