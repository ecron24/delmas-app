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
  total_ttc: number; // ✅ AJOUT CRITIQUE
  intervention_types: Array<{ intervention_type: string }>;
  invoice_total?: number | null;
  has_final_invoice?: boolean;
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

  if (!clientData) {
    return { client: null, interventions: [] };
  }

 // ✅ CORRECTION : Revenir à la requête originale mais s'assurer que total_ttc est inclus
const { data: interventionsData } = await supabase
  .schema('piscine_delmas_public')
  .from('interventions')
  .select(`
    *,
    intervention_types:intervention_types_junction(intervention_type)
  `)
  .eq('client_id', id)
  .order('scheduled_date', { ascending: false });

  if (!interventionsData || interventionsData.length === 0) {
    return { client: clientData, interventions: [] };
  }

  // Récupérer les factures séparément
  const interventionIds = interventionsData.map(i => i.id);

  const { data: invoicesData } = await supabase
    .schema('piscine_delmas_compta')
    .from('invoices')
    .select('*')
    .in('intervention_id', interventionIds)
    .eq('invoice_type', 'final')
    .eq('status', 'sent');

  // Associer les factures aux interventions
  const interventionsWithInvoiceData = interventionsData.map(intervention => {
    const finalInvoice = invoicesData?.find(inv => inv.intervention_id === intervention.id);

    return {
      ...intervention,
      invoice_total: finalInvoice?.total_ttc || null,
      has_final_invoice: !!finalInvoice
    };
  });

  return {
    client: clientData,
    interventions: interventionsWithInvoiceData,
  };
});

type ClientWithCount = Client & {
  intervention_count: number;
};

/**
 * Récupère tous les clients avec comptage d'interventions
 * Cache automatique pendant le rendu
 */
export const getClients = cache(async (): Promise<ClientWithCount[]> => {
  const supabase = createServerClient();

  const { data } = await supabase
    .schema('piscine_delmas_public')
    .from('clients')
    .select(`
      *,
      interventions(count)
    `)
    .order('last_name')
    .order('first_name');

  const clientsWithCount = data?.map(c => ({
    ...c,
    intervention_count: c.interventions?.[0]?.count || 0,
  })) || [];

  return clientsWithCount as ClientWithCount[];
});
