'use client';

import { useRouter } from 'next/navigation';
import { Clock, CheckCircle, AlertCircle, DollarSign, X } from 'lucide-react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
  payment_method?: string;
  paid_at?: string;
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
  onUpdate?: () => void; // Callback pour rafraîchir la liste après paiement
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

function getPaymentMethodLabel(method: string) {
  const labels: Record<string, string> = {
    cb: '💳 CB',
    cheque: '📄 Chèque',
    virement: '🏦 Virement',
    especes: '💵 Espèces',
  };
  return labels[method] || method;
}

export function InvoiceList({ invoices, onUpdate }: InvoiceListProps) {
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cb');
  const [processing, setProcessing] = useState(false);

  const handleMarkAsPaid = async () => {
    if (!selectedInvoice) return;

    setProcessing(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .schema('piscine_delmas_compta')
        .from('invoices')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          paid_at: new Date().toISOString(),
          amount_paid: selectedInvoice.total_ttc,
        })
        .eq('id', selectedInvoice.id);

      if (error) {
        alert('❌ Erreur lors du marquage comme payée');
        console.error(error);
      } else {
        setShowPaymentModal(false);
        setSelectedInvoice(null);

        // Rafraîchir la liste si callback fourni
        if (onUpdate) {
          onUpdate();
        } else {
          // Sinon recharger la page
          window.location.reload();
        }
      }
    } catch (error) {
      console.error(error);
      alert('❌ Erreur réseau');
    } finally {
      setProcessing(false);
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="text-center py-12">
          <p className="text-4xl mb-2">🔭</p>
          <p className="text-gray-600">Aucune facture trouvée</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="divide-y-2 divide-gray-200">
          {invoices.map((invoice) => {
            const client = invoice.intervention?.client;

            let clientName = 'Client non défini';
            if (client) {
              if (client.type === 'professionnel' && client.company_name) {
                clientName = client.company_name;
              } else {
                clientName = `${client.first_name} ${client.last_name}`;
              }
            }

            // 💰 Peut être marquée comme payée si : statut "sent" ET type "final"
            const canMarkAsPaid = invoice.status === 'sent' && invoice.invoice_type === 'final';

            return (
              <div
                key={invoice.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Zone cliquable pour aller à l'intervention */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/dashboard/interventions/${invoice.intervention_id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base line-clamp-1">
                        {clientName}
                      </h3>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>📋 {invoice.invoice_number}</div>
                      <div>📅 Émise : {new Date(invoice.issue_date).toLocaleDateString('fr-FR')}</div>
                      <div>📆 Échéance : {new Date(invoice.due_date).toLocaleDateString('fr-FR')}</div>

                      {/* Affichage des infos de paiement si payée */}
                      {invoice.payment_method && invoice.paid_at && (
                        <div className="text-green-600 font-semibold mt-1">
                          {getPaymentMethodLabel(invoice.payment_method)} - Payée le {new Date(invoice.paid_at).toLocaleDateString('fr-FR')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Zone montant + bouton */}
                  <div className="text-right flex flex-col gap-2 items-end">
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {invoice.total_ttc.toFixed(2)}€
                    </p>

                    {/* 💰 BOUTON MARQUER COMME PAYÉE */}
                    {canMarkAsPaid && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Empêcher la navigation
                          setSelectedInvoice(invoice);
                          setShowPaymentModal(true);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors active:scale-95 shadow-sm"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Payée
                      </button>
                    )}

                    {/* Affichage montant payé (si partiel) */}
                    {invoice.amount_paid && invoice.amount_paid > 0 && invoice.amount_paid < invoice.total_ttc && (
                      <p className="text-xs text-green-600">
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

      {/* 📱 MODAL PAIEMENT */}
      {showPaymentModal && selectedInvoice && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!processing) {
              setShowPaymentModal(false);
              setSelectedInvoice(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()} // Empêcher la fermeture au clic sur le modal
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                💰 Marquer comme payée
              </h3>
              <button
                onClick={() => {
                  if (!processing) {
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                  }
                }}
                disabled={processing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Info facture */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">
                Facture : <span className="font-semibold text-gray-900">{selectedInvoice.invoice_number}</span>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Client : <span className="font-semibold text-gray-900">
                  {selectedInvoice.intervention?.client?.type === 'professionnel' && selectedInvoice.intervention?.client?.company_name
                    ? selectedInvoice.intervention.client.company_name
                    : `${selectedInvoice.intervention?.client?.first_name} ${selectedInvoice.intervention?.client?.last_name}`
                  }
                </span>
              </p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {selectedInvoice.total_ttc.toFixed(2)}€
              </p>
            </div>

            {/* Sélection mode de paiement */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Mode de paiement :
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cb', label: '💳 CB', icon: '💳' },
                  { value: 'cheque', label: '📄 Chèque', icon: '📄' },
                  { value: 'virement', label: '🏦 Virement', icon: '🏦' },
                  { value: 'especes', label: '💵 Espèces', icon: '💵' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPaymentMethod(option.value)}
                    disabled={processing}
                    className={`p-3 rounded-lg border-2 font-semibold text-sm transition-all disabled:opacity-50 ${
                      paymentMethod === option.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-1">{option.icon}</div>
                    <div>{option.label.split(' ')[1]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Boutons action */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedInvoice(null);
                }}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>En cours...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style pour l'animation du modal */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </>
  );
}
