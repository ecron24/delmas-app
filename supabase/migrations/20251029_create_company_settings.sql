-- Migration: Create company_settings table for white label configuration
-- Description: Allows each client to configure their company information, legal mentions, and CGV

-- Create company_settings table in piscine_delmas_public schema
CREATE TABLE IF NOT EXISTS piscine_delmas_public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Company basic info
  company_name TEXT NOT NULL DEFAULT 'PISCINE DELMAS',
  company_address TEXT NOT NULL DEFAULT 'Le bois Simon (les linguettes)',
  company_postal_code TEXT NOT NULL DEFAULT '24370',
  company_city TEXT NOT NULL DEFAULT 'Pechs de l''esperance',

  -- Legal info
  siret TEXT NOT NULL DEFAULT '483 093 118',
  tva_number TEXT NOT NULL DEFAULT 'FR38483093118',
  legal_form TEXT, -- EI, SARL, SAS, SASU, etc.
  share_capital TEXT, -- Capital social (si applicable)
  rcs_city TEXT, -- Ville d'immatriculation RCS
  rcs_number TEXT, -- Numéro RCS

  -- Contact info
  email TEXT NOT NULL DEFAULT 'contact@piscine-delmas.fr',
  phone TEXT NOT NULL DEFAULT '06 87 84 24 99',
  website TEXT,

  -- Invoice settings
  invoice_prefix TEXT NOT NULL DEFAULT 'PRO',
  payment_delay_days INTEGER NOT NULL DEFAULT 30,
  late_payment_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00, -- Taux de pénalités de retard (%)
  recovery_fee NUMERIC(10,2) NOT NULL DEFAULT 40.00, -- Indemnité forfaitaire de recouvrement

  -- Legal mentions and CGV
  invoice_footer_notes TEXT DEFAULT 'Conditions de paiement : 30 jours à compter de la date d''émission',
  legal_mentions TEXT DEFAULT 'En cas de retard de paiement, seront exigibles une indemnité de 40€ pour frais de recouvrement ainsi que des pénalités de retard calculées sur la base de 3 fois le taux d''intérêt légal.',
  general_conditions TEXT, -- Conditions générales de vente complètes

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6', -- Couleur principale de l'app

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE piscine_delmas_public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read company settings
CREATE POLICY "Allow authenticated users to read company settings"
  ON piscine_delmas_public.company_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to update company settings
CREATE POLICY "Allow authenticated users to update company settings"
  ON piscine_delmas_public.company_settings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default settings (only if table is empty)
INSERT INTO piscine_delmas_public.company_settings (
  company_name,
  company_address,
  company_postal_code,
  company_city,
  siret,
  tva_number,
  email,
  phone,
  invoice_footer_notes,
  legal_mentions
)
SELECT
  'PISCINE DELMAS',
  'Le bois Simon (les linguettes)',
  '24370',
  'Pechs de l''esperance',
  '483 093 118',
  'FR38483093118',
  'contact@piscine-delmas.fr',
  '06 87 84 24 99',
  'Conditions de paiement : règlement sous 30 jours à compter de la date d''émission de la facture.',
  'En cas de retard de paiement, seront exigibles conformément à l''article L441-6 du Code de Commerce : une indemnité forfaitaire de 40€ pour frais de recouvrement, ainsi que des pénalités de retard au taux de 12% l''an (soit 3 fois le taux d''intérêt légal), applicables dès le lendemain de la date d''échéance figurant sur la facture. Tout mois commencé est dû en entier. Escompte pour paiement anticipé : néant. Clause de réserve de propriété : les marchandises restent la propriété du vendeur jusqu''au paiement intégral du prix.'
WHERE NOT EXISTS (SELECT 1 FROM piscine_delmas_public.company_settings);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION piscine_delmas_public.update_company_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = piscine_delmas_public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_company_settings_updated_at_trigger ON piscine_delmas_public.company_settings;
CREATE TRIGGER update_company_settings_updated_at_trigger
  BEFORE UPDATE ON piscine_delmas_public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION piscine_delmas_public.update_company_settings_updated_at();

-- Add comment
COMMENT ON TABLE piscine_delmas_public.company_settings IS 'White label configuration: stores company information, legal mentions, and invoice settings';
