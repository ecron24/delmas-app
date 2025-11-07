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
    .select('id, subtotal_ht, total_tva, total_ttc, tax_amount')
    .eq('intervention_id', id)
    .maybeSingle();

  // Si une facture existe, récupérer ses lignes et CALCULER les totaux
  if (invoice) {
    // Récupérer les lignes de facture séparément (pour éviter les problèmes de schéma)
    const { data: invoiceItems } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoice_items')
      .select('id, description, quantity, unit_price, tva_rate')
      .eq('invoice_id', invoice.id)
      .order('id', { ascending: true });

    // ✅ CALCULER les totaux à la volée (comme la page facture)
    // Main d'œuvre
    const laborHT = (data.labor_hours || 0) * (data.labor_rate || 0);
    const laborTVA = laborHT * 0.20;

    // Déplacement
    const travelHT = data.travel_fee || 0;
    const travelTVA = travelHT * 0.20;

    // Produits depuis invoice_items
    const productsHT = (invoiceItems || []).reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );
    const productsTVA = (invoiceItems || []).reduce((sum, item) => {
      const item_ht = item.quantity * item.unit_price;
      const item_tva = item_ht * (item.tva_rate / 100);
      return sum + item_tva;
    }, 0);

    // Totaux
    const subtotal_ht = laborHT + travelHT + productsHT;
    const total_tva = laborTVA + travelTVA + productsTVA;
    const total_ttc = subtotal_ht + total_tva;

    return {
      ...data,
      subtotal: subtotal_ht,
      tax_amount: total_tva,
      total_ttc: total_ttc,
      invoice_id: invoice.id,
      invoice_items: invoiceItems || [] // ✅ TOUTES les lignes : produits uniquement (labor/travel calculés)
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

  // ✅ CALCULER les totaux à la volée (comme la page facture)
  if (!data || data.length === 0) return [];

  // Récupérer toutes les factures en une seule requête
  const interventionIds = data.map(i => i.id);
  const { data: invoices } = await supabase
    .schema('piscine_delmas_compta')
    .from('invoices')
    .select('id, intervention_id')
    .in('intervention_id', interventionIds);

  // Récupérer tous les invoice_items en une seule requête
  const invoiceIds = (invoices || []).map(inv => inv.id);
  const { data: allInvoiceItems } = await supabase
    .schema('piscine_delmas_compta')
    .from('invoice_items')
    .select('invoice_id, quantity, unit_price, tva_rate')
    .in('invoice_id', invoiceIds);

  // Grouper les items par invoice_id
  const itemsByInvoiceId = new Map();
  if (allInvoiceItems) {
    allInvoiceItems.forEach(item => {
      if (!itemsByInvoiceId.has(item.invoice_id)) {
        itemsByInvoiceId.set(item.invoice_id, []);
      }
      itemsByInvoiceId.get(item.invoice_id).push(item);
    });
  }

  // Créer un map invoice_id → intervention_id
  const invoiceToInterventionMap = new Map();
  if (invoices) {
    invoices.forEach(inv => {
      invoiceToInterventionMap.set(inv.intervention_id, inv.id);
    });
  }

  // Enrichir chaque intervention avec les totaux CALCULÉS
  return data.map(intervention => {
    const invoiceId = invoiceToInterventionMap.get(intervention.id);

    if (invoiceId) {
      // Main d'œuvre
      const laborHT = (intervention.labor_hours || 0) * (intervention.labor_rate || 0);
      const laborTVA = laborHT * 0.20;

      // Déplacement
      const travelHT = intervention.travel_fee || 0;
      const travelTVA = travelHT * 0.20;

      // Produits depuis invoice_items
      const items = itemsByInvoiceId.get(invoiceId) || [];
      const productsHT = items.reduce((sum, item) =>
        sum + (item.quantity * item.unit_price), 0
      );
      const productsTVA = items.reduce((sum, item) => {
        const item_ht = item.quantity * item.unit_price;
        const item_tva = item_ht * (item.tva_rate / 100);
        return sum + item_tva;
      }, 0);

      // Totaux
      const subtotal_ht = laborHT + travelHT + productsHT;
      const total_tva = laborTVA + travelTVA + productsTVA;
      const total_ttc = subtotal_ht + total_tva;

      return {
        ...intervention,
        subtotal: subtotal_ht,
        tax_amount: total_tva,
        total_ttc: total_ttc
      };
    }

    return intervention;
  });
});
