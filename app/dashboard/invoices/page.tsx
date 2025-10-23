'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FileText, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';

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
    reference: string;
    scheduled_date: string;
    client: {
      first_name: string;
      last_name: string;
      company_name: string | null;
      type: string;
    };
  };
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('Erreur chargement factures:', error);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    // Charger les interventions associées
    const interventionIds = data.map(inv => inv.intervention_id);

    const { data: interventions, error: intError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        id,
        reference,
        scheduled_date,
        client:clients(first_name, last_name, company_name, type)
      `)
      .in('id', interventionIds);

    if (intError) {
      console.error('Erreur interventions:', intError);
    }

    const invoicesWithDetails = data.map(invoice => ({
      ...invoice,
      intervention: interventions?.find(i => i.id === invoice.intervention_id),
    }));

    setInvoices(invoicesWithDetails);
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock, label: 'Brouillon' },
      sent: { bg: 'bg-blue-100', text: 'text-blue-800', icon: AlertCircle, label: 'Envoyée' },
      paid: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle, label: 'Payée' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertCircle, label: 'En retard' },
    };

    const style = styles[status as keyof typeof styles] || styles.draft;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {style.label}
      </span>
    );
  };

  const filteredInvoices = filter === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === filter);

  const stats = {
    total: invoices.length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    overdue: invoices.filter(i => i.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.total_ttc, 0),
    paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + inv.total_ttc, 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* HEADER */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📄 Factures</h1>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <FileText className="w-8 h-8 text-primary mb-2" />
            <span className="text-3xl font-bold text-primary mb-1">{stats.total}</span>
            <p className="text-xs font-semibold text-gray-900">Total factures</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <Clock className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-3xl font-bold text-blue-600 mb-1">{stats.sent}</span>
            <p className="text-xs font-semibold text-gray-900">En attente</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-3xl font-bold text-green-600 mb-1">{stats.paid}</span>
            <p className="text-xs font-semibold text-gray-900">Payées</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
            <span className="text-3xl font-bold text-red-600 mb-1">{stats.overdue}</span>
            <p className="text-xs font-semibold text-gray-900">En retard</p>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'sent', 'paid', 'overdue'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-secondary text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-200'
            }`}
          >
            {f === 'all' ? 'Toutes' : f === 'sent' ? 'En attente' : f === 'paid' ? 'Payées' : 'En retard'}
          </button>
        ))}
      </div>

      {/* LISTE FACTURES */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-gray-600">Aucune facture trouvée</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-gray-200">
            {filteredInvoices.map((invoice) => {
              const client = invoice.intervention?.client;
              const clientName = client?.type === 'professionnel' && client?.company_name
                ? client.company_name
                : client
                  ? `${client.first_name} ${client.last_name}`
                  : 'Client non défini';

              return (
                <div
                  key={invoice.intervention_id}
                  onClick={() => router.push(`/dashboard/interventions/${invoice.intervention_id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">
                          {clientName}
                        </h3>
                        {getStatusBadge(invoice.status)}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>📋 {invoice.invoice_number}</div>
                        <div>📅 Émise : {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}</div>
                        <div>📆 Échéance : {new Date(invoice.due_date).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{invoice.total_ttc.toFixed(2)}€</p>
                      {invoice.amount_paid > 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          Payé : {invoice.amount_paid.toFixed(2)}€
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
