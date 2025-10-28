-- ============================================
-- MIGRATION: Activer RLS sur invoice_number_sequences
-- Date: 2025-10-28
-- Description: Active Row Level Security sur la table invoice_number_sequences
--              Cette table ne doit être accessible que par les fonctions internes
-- ============================================

SET search_path TO piscine_delmas_compta;

-- Activer RLS sur la table
ALTER TABLE invoice_number_sequences ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour interdire tout accès direct
-- Seules les fonctions avec SECURITY INVOKER peuvent y accéder
CREATE POLICY "invoice_number_sequences_no_direct_access"
ON invoice_number_sequences
FOR ALL
TO public
USING (false);

-- Permettre l'accès aux utilisateurs authentifiés via les fonctions
-- (les fonctions byppassent le RLS grâce à SECURITY INVOKER)
CREATE POLICY "invoice_number_sequences_function_access"
ON invoice_number_sequences
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "invoice_number_sequences_no_direct_access" ON invoice_number_sequences
IS 'Interdit tout accès direct public à la table';

COMMENT ON POLICY "invoice_number_sequences_function_access" ON invoice_number_sequences
IS 'Permet l''accès via les fonctions pour les utilisateurs authentifiés';

-- Vérification
DO $$
BEGIN
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'invoice_number_sequences') THEN
        RAISE EXCEPTION 'RLS was not enabled on invoice_number_sequences';
    END IF;

    RAISE NOTICE 'Migration completed successfully! RLS enabled on invoice_number_sequences.';
END $$;
