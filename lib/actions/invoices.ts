// lib/actions/invoices.ts
import { createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

type Invoice = {
  intervention_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  total_ht: number;
  total_ttc: number;
  amount_paid: number;
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
    .order('invoice_date', { ascending: false });

  if (error || !data || data.length === 0) {
    console.error('Erreur chargement factures:', error);
    return {
      invoices: [],
      stats: {
        total: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        totalAmount: 0,
        paidAmount: 0,
      },
    };
  }

  // Charger les interventions associées
  const interventionIds = data.map(inv => inv.intervention_id);

  const { data: interventions } = await supabase
    .schema('piscine_delmas_public')
    .from('interventions')
    .select(`
      id,
      reference,
      scheduled_date,
      client:clients(first_name, last_name, company_name, type)
    `)
    .in('id', interventionIds);

  const invoicesWithDetails = data.map(invoice => ({
    ...invoice,
    intervention: interventions?.find(i => i.id === invoice.intervention_id),
  })) as Invoice[];

  // Calculer les stats
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
