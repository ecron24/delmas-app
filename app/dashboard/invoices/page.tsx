// ✅ SERVER COMPONENT (pas de 'use client')
import { getInvoices } from '@/lib/actions/invoices';
import { InvoiceFilters } from '@/app/components/invoices/InvoiceFilters';
import { InvoiceList } from '@/app/components/invoices/InvoiceList';
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';

type PageProps = {
  searchParams: { filter?: string };
};

export default async function InvoicesPage({ searchParams }: PageProps) {
  // ✅ Récupération des données côté serveur
  const { invoices, stats } = await getInvoices();

  // Filtrage côté serveur
  const filter = searchParams.filter || 'all';
  const filteredInvoices = filter === 'all'
    ? invoices
    : invoices.filter(inv => inv.status === filter);

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

      {/* FILTRES (Client Component) */}
      <InvoiceFilters />

      {/* LISTE FACTURES (Client Component pour navigation) */}
      <InvoiceList invoices={filteredInvoices} />
    </div>
  );
}
