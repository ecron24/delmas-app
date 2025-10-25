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

/**
 * Supprime un client (uniquement s'il n'a pas d'interventions)
 * Retourne un objet { success: boolean, message: string, interventionCount?: number }
 */
export async function deleteClient(clientId: string): Promise<{ success: boolean; message: string; interventionCount?: number }> {
  'use server';

  const supabase = createServerClient();

  try {
    // 1. Vérifier si le client a des interventions
    const { data: interventions, error: countError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('id')
      .eq('client_id', clientId);

    if (countError) {
      return {
        success: false,
        message: 'Erreur lors de la vérification des interventions',
      };
    }

    const interventionCount = interventions?.length || 0;

    // 2. Si le client a des interventions, empêcher la suppression
    if (interventionCount > 0) {
      return {
        success: false,
        message: `Impossible de supprimer ce client : ${interventionCount} intervention(s) liée(s)`,
        interventionCount,
      };
    }

    // 3. Supprimer le client
    const { error: deleteError } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      console.error('Erreur suppression client:', deleteError);
      return {
        success: false,
        message: 'Erreur lors de la suppression du client',
      };
    }

    return {
      success: true,
      message: 'Client supprimé avec succès',
    };

  } catch (error) {
    console.error('Erreur deleteClient:', error);
    return {
      success: false,
      message: 'Erreur inattendue lors de la suppression',
    };
  }
}
