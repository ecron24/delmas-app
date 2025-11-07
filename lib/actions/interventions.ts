// lib/actions/interventions.ts
import { createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

/**
 * Récupère une intervention par son ID (avec cache React)
 * Cache automatique pendant le rendu du composant
 */
export const getIntervention = cache(async (id: string) => {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .schema('piscine_delmas_public')
    .from('interventions')
    .select(`
      *,
      client:clients(*),
      intervention_types_junction(intervention_type)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erreur récupération intervention:', error);
    return null;
  }

  return data;
});

/**
 * Récupère toutes les interventions avec leurs relations
 */
export const getInterventions = cache(async () => {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .schema('piscine_delmas_public')
    .from('interventions')
    .select(`
      *,
      client:clients(id, first_name, last_name, company_name, type),
      intervention_types_junction(intervention_type)
    `)
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Erreur récupération interventions:', error);
    return [];
  }

  return data || [];
});
