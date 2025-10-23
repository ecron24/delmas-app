// lib/actions/clients.ts
import { createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

type Client = {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  notes: string | null;
};

type Intervention = {
  id: string;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  intervention_types: Array<{ intervention_type: string }>;
};

/**
 * Récupère un client par son ID avec ses interventions
 * Cache automatique pendant le rendu
 */
export const getClient = cache(async (id: string): Promise<{ client: Client | null; interventions: Intervention[] }> => {
  const supabase = createServerClient();

  const { data: clientData } = await supabase
    .schema('piscine_delmas_public')
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  const { data: interventionsData } = await supabase
    .schema('piscine_delmas_public')
    .from('interventions')
    .select(`
      *,
      intervention_types:intervention_types_junction(intervention_type)
    `)
    .eq('client_id', id)
    .order('scheduled_date', { ascending: false });

  return {
    client: clientData,
    interventions: interventionsData || [],
  };
});
