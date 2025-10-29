'use server';

import { createClient } from '@/lib/supabase/server';

export interface CompanySettings {
  id: string;
  company_name: string;
  company_address: string;
  company_postal_code: string;
  company_city: string;
  siret: string;
  tva_number: string;
  legal_form?: string;
  share_capital?: string;
  rcs_city?: string;
  rcs_number?: string;
  email: string;
  phone: string;
  website?: string;
  invoice_prefix: string;
  payment_delay_days: number;
  late_payment_rate: number;
  recovery_fee: number;
  invoice_footer_notes?: string;
  legal_mentions?: string;
  general_conditions?: string;
  logo_url?: string;
  primary_color: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
}

/**
 * Get company settings (returns the first/only record)
 */
export async function getCompanySettings(): Promise<{ data: CompanySettings | null; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching company settings:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Error in getCompanySettings:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Update company settings
 */
export async function updateCompanySettings(
  id: string,
  updates: Partial<CompanySettings>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Update settings
    const { error } = await supabase
      .schema('piscine_delmas_public')
      .from('company_settings')
      .update({
        ...updates,
        updated_by: user.id,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating company settings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in updateCompanySettings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initialize company settings if none exist
 */
export async function initializeCompanySettings(): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    // Check if settings already exist
    const { data: existing } = await supabase
      .schema('piscine_delmas_public')
      .from('company_settings')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      return { success: true, error: null }; // Already initialized
    }

    // Create default settings
    const { error } = await supabase
      .schema('piscine_delmas_public')
      .from('company_settings')
      .insert({
        company_name: 'Ma Société',
        company_address: 'Adresse à configurer',
        company_postal_code: '00000',
        company_city: 'Ville',
        siret: 'À CONFIGURER',
        tva_number: 'À CONFIGURER',
        email: 'contact@example.com',
        phone: '00 00 00 00 00',
        invoice_footer_notes: 'Conditions de paiement : règlement sous 30 jours.',
        legal_mentions: 'Mentions légales à configurer dans les paramètres.',
      });

    if (error) {
      console.error('Error initializing company settings:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error in initializeCompanySettings:', error);
    return { success: false, error: error.message };
  }
}
