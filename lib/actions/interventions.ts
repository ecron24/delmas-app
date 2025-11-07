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

  // ✅ FIX PROFESSIONNEL : Récupérer les VRAIS totaux depuis la facture
  // La facture calcule correctement, l'intervention non
  const { data: invoice } = await supabase
    .schema('piscine_delmas_compta')
    .from('invoices')
    .select(`
      id,
      subtotal_ht,
      total_tva,
      total_ttc,
      tax_amount,
      invoice_items:invoice_items(
        id,
        description,
        quantity,
        unit_price,
        tva_rate
      )
    `)
    .eq('intervention_id', id)
    .maybeSingle();

  // Si une facture existe, utiliser SES totaux (corrects : 312€ au lieu de 36€)
  if (invoice) {
    return {
      ...data,
      subtotal: invoice.subtotal_ht,
      tax_amount: invoice.tax_amount || invoice.total_tva,
      total_ttc: invoice.total_ttc,
      invoice_id: invoice.id,
      invoice_items: invoice.invoice_items || [] // ✅ Ajouter les lignes de facture
    };
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

  // ✅ FIX PROFESSIONNEL : Récupérer les totaux depuis les factures pour TOUTES les interventions
  if (!data || data.length === 0) return [];

  // Récupérer toutes les factures en une seule requête
  const interventionIds = data.map(i => i.id);
  const { data: invoices } = await supabase
    .schema('piscine_delmas_compta')
    .from('invoices')
    .select('intervention_id, subtotal_ht, total_tva, total_ttc, tax_amount')
    .in('intervention_id', interventionIds);

  // Créer un map pour accès rapide
  const invoiceMap = new Map();
  if (invoices) {
    invoices.forEach(inv => {
      invoiceMap.set(inv.intervention_id, inv);
    });
  }

  // Enrichir chaque intervention avec les totaux de sa facture
  return data.map(intervention => {
    const invoice = invoiceMap.get(intervention.id);
    if (invoice) {
      return {
        ...intervention,
        subtotal: invoice.subtotal_ht,
        tax_amount: invoice.tax_amount || invoice.total_tva,
        total_ttc: invoice.total_ttc
      };
    }
    return intervention;
  });
});
