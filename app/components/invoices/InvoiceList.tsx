'use client';

import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

type Invoice = {
  id: string;
  intervention_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  invoice_type: string;
  subtotal_ht: number;
  total_ttc: number;
  amount_paid?: number;
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

type InvoiceListProps = {
  invoices: Invoice[];
};

function getStatusBadge(status: string) {
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
}

export function InvoiceList({ invoices }: InvoiceListProps) {
  const router = useRouter();

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-gray-600">Aucune facture trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
      <div className="divide-y-2 divide-gray-200">
        {invoices.map((invoice) => {
          const client = invoice.intervention?.client;

          // ✅ Logique simplifiée pour éviter les erreurs de parsing
          let clientName = 'Client non défini';
          if (client) {
            if (client.type === 'professionnel' && client.company_name) {
              clientName = client.company_name;
            } else {
              clientName = `${client.first_name} ${client.last_name}`;
            }
          }

          return (
            <div
              key={invoice.id}
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
                    <div>📅 Émise : {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</div>
                    <div>📆 Échéance : {new Date(invoice.due_date).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{invoice.total_ttc.toFixed(2)}€</p>
                  {invoice.amount_paid && invoice.amount_paid > 0 && (
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
    </div>
  );
}
