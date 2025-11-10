// lib/actions/invoices.ts
import { createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

type Invoice = {
  id: string;                                               // ← Ajouté
  intervention_id: string;
  invoice_number: string;
  issue_date: string;                                       // ← Corrigé : issue_date
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  invoice_type: string;                                     // ← Ajouté
  subtotal_ht: number;                                      // ← Corrigé : subtotal_ht
  total_ttc: number;
  amount_paid?: number;                                     // ← Optionnel
  intervention?: {
    id: string;
    reference: string;
    scheduled_date: string;
    client: {
      first_name: string;
      last_name: string;
      company_name: string | null;
      type: string;
    } | null;
  };
};

type InvoiceStats = {
  total: number;
  sent: number;
  paid: number;
  overdue: number;
  totalAmount: number;
  paidAmount: number;
};

/**
 * Récupère toutes les factures avec interventions et statistiques
 * Cache automatique pendant le rendu
 */
export const getInvoices = cache(async (): Promise<{ invoices: Invoice[]; stats: InvoiceStats }> => {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .schema('piscine_delmas_compta')
    .from('invoices')
    .select('*')
    .neq('status', 'draft')                                 // ← Exclut les brouillons
    .order('issue_date', { ascending: false });             // ← Corrigé : issue_date

  if (error) {
    console.error('Erreur chargement factures:', error);
    return {
      invoices: [],
      stats: { total: 0, sent: 0, paid: 0, overdue: 0, totalAmount: 0, paidAmount: 0 }
    };
  }

  if (!data || data.length === 0) {
    return {
      invoices: [],
      stats: { total: 0, sent: 0, paid: 0, overdue: 0, totalAmount: 0, paidAmount: 0 }
    };
  }

  // Charger les interventions associées AVEC labor_hours, labor_rate, travel_fee
  const interventionIds = data.map(inv => inv.intervention_id);

  const { data: interventions } = await supabase
    .schema('piscine_delmas_public')
    .from('interventions')
    .select(`
      id,
      reference,
      scheduled_date,
      labor_hours,
      labor_rate,
      travel_fee,
      client:clients(first_name, last_name, company_name, type)
    `)
    .in('id', interventionIds);

  // Récupérer tous les invoice_items en une seule requête
  const invoiceIds = data.map(inv => inv.id);
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

  // ✅ CALCULER les totaux à la volée pour chaque facture
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Minuit pour comparaison propre

  const invoicesWithDetails = data.map(invoice => {
    const intervention = interventions?.find(i => i.id === invoice.intervention_id);

    if (!intervention) {
      return {
        ...invoice,
        intervention: null,
      };
    }

    // Calculer le total TTC correct
    const laborHT = (intervention.labor_hours || 0) * (intervention.labor_rate || 0);
    const laborTVA = laborHT * 0.20;

    const travelHT = intervention.travel_fee || 0;
    const travelTVA = travelHT * 0.20;

    const items = itemsByInvoiceId.get(invoice.id) || [];
    const productsHT = items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );
    const productsTVA = items.reduce((sum, item) => {
      const item_ht = item.quantity * item.unit_price;
      const item_tva = item_ht * (item.tva_rate / 100);
      return sum + item_tva;
    }, 0);

    const subtotal_ht = laborHT + travelHT + productsHT;
    const total_tva = laborTVA + travelTVA + productsTVA;
    const total_ttc = subtotal_ht + total_tva;

    // ✅ CALCULER le statut "overdue" à la volée
    // Une facture est en retard si : status = 'sent' ET due_date < aujourd'hui
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const isOverdue = invoice.status === 'sent' && dueDate < today;
    const calculatedStatus = isOverdue ? 'overdue' : invoice.status;

    return {
      ...invoice,
      subtotal_ht,
      total_ttc,
      status: calculatedStatus as 'draft' | 'sent' | 'paid' | 'overdue', // ✅ Statut calculé
      intervention: {
        id: intervention.id,
        reference: intervention.reference,
        scheduled_date: intervention.scheduled_date,
        client: intervention.client,
      },
    };
  }) as Invoice[];

  // Calculer les stats avec les VRAIS totaux
  const stats: InvoiceStats = {
    total: invoicesWithDetails.length,
    sent: invoicesWithDetails.filter(i => i.status === 'sent').length,
    paid: invoicesWithDetails.filter(i => i.status === 'paid').length,
    overdue: invoicesWithDetails.filter(i => i.status === 'overdue').length,
    totalAmount: invoicesWithDetails.reduce((sum, inv) => sum + inv.total_ttc, 0),
    paidAmount: invoicesWithDetails.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total_ttc, 0),
  };

  return { invoices: invoicesWithDetails, stats };
});
