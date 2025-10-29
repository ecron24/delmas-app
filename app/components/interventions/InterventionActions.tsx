'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type InterventionActionsProps = {
  interventionId: string;
  status: string;
  clientPresent: boolean | null;
  clientSignedAt: string | null;
};

type InvoiceInfo = {
  id: string;
  invoice_type: 'proforma' | 'final';
  status: string;
  proforma_validated_at: string | null;
} | null;

export function InterventionActions({
  interventionId,
  status,
  clientPresent,
  clientSignedAt
}: InterventionActionsProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  // 📧 États pour l'email de confirmation
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSentAt, setEmailSentAt] = useState<string | null>(null);

  // 🧾 NOUVEAU : États pour la facture
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(true);

  // 🔍 Vérifier le statut de l'email au chargement
  useEffect(() => {
    if (status === 'completed') {
      checkEmailStatus();
      checkInvoiceStatus(); // ← NOUVEAU
    }
  }, [interventionId, status]);

  const checkEmailStatus = async () => {
    try {
      const supabase = createClient();

      const { data: emailLog } = await supabase
        .schema('piscine_delmas_public')
        .from('email_logs')
        .select('status, sent_at')
        .eq('intervention_id', interventionId)
        .eq('status', 'sent')
        .maybeSingle();

      if (emailLog) {
        setEmailSent(true);
        setEmailSentAt(emailLog.sent_at);
      } else {
        setEmailSent(false);
        setEmailSentAt(null);
      }
    } catch (error) {
      console.error('❌ Erreur vérification email:', error);
      setEmailSent(false);
    } finally {
      setEmailLoading(false);
    }
  };

  // 🧾 NOUVELLE FONCTION : Vérifier le statut de la facture
  const checkInvoiceStatus = async () => {
    try {
      const supabase = createClient();

      const { data: invoice } = await supabase
        .schema('piscine_delmas_compta')
        .from('invoices')
        .select('id, invoice_type, status, proforma_validated_at')
        .eq('intervention_id', interventionId)
        .in('invoice_type', ['proforma', 'final'])
        .maybeSingle();

      setInvoiceInfo(invoice);
    } catch (error) {
      console.error('❌ Erreur vérification facture:', error);
      setInvoiceInfo(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleStartIntervention = async () => {
    setActionLoading(true);
    const supabase = createClient();

    const { error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', interventionId);

    if (!error) {
      router.refresh(); // Recharge les données côté serveur
    } else {
      alert('❌ Erreur lors du démarrage');
    }
    setActionLoading(false);
  };

  const handleSendConfirmation = async () => {
    if (emailSent) {
      alert('✅ Email de confirmation déjà envoyé !');
      return;
    }

    if (!confirm('📧 Envoyer l\'email de confirmation au client ?')) return;

    setEmailSending(true);

    try {
      const response = await fetch(`/api/interventions/${interventionId}/send-confirmation`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('✅ Email envoyé avec succès !');
        setEmailSent(true);
        setEmailSentAt(new Date().toISOString());
      } else {
        // Gérer les différents cas d'erreur
        if (data.error === 'Email de confirmation déjà envoyé') {
          alert('ℹ️ Email de confirmation déjà envoyé.');
          setEmailSent(true);
          // Recharger le statut pour être sûr
          await checkEmailStatus();
        } else {
          alert(`❌ Erreur lors de l'envoi: ${data.error || 'Erreur inconnue'}`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur réseau:', error);
      alert('❌ Erreur de connexion lors de l\'envoi');
    } finally {
      setEmailSending(false);
    }
  };

  // 🧾 NOUVELLE FONCTION : Gérer le bouton facture
  const renderInvoiceButton = () => {
    if (invoiceLoading) {
      return (
        <div className="w-full bg-gray-100 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600">Vérification facture...</span>
        </div>
      );
    }

    // CAS 1 : Aucune facture
    if (!invoiceInfo) {
      return (
        <div className="w-full bg-gray-50 border-2 border-gray-300 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
          <span className="text-2xl">📋</span>
          <span className="text-gray-600">Facture générée automatiquement</span>
        </div>
      );
    }

    // CAS 2 : Facture finale validée
    if (invoiceInfo.invoice_type === 'final') {
      return (
        <button
          onClick={() => router.push(`/dashboard/interventions/${interventionId}/invoice`)}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
        >
          📄 Voir facture finale
        </button>
      );
    }

    // CAS 3 : Facture proforma en cours
    if (invoiceInfo.invoice_type === 'proforma') {
      return (
        <button
          onClick={() => router.push(`/dashboard/interventions/${interventionId}/invoice`)}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-purple-700 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
        >
          📝 Gérer facture proforma (interne)
        </button>
      );
    }

    return null;
  };

  // ========================================
  // CAS 1 : INTERVENTION PLANIFIÉE
  // ========================================
  if (status === 'scheduled') {
    return (
      <div className="space-y-3">
        <button
          onClick={handleStartIntervention}
          disabled={actionLoading}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {actionLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Démarrage...
            </>
          ) : (
            <>🚀 Démarrer l'intervention</>
          )}
        </button>

        <button
          onClick={() => router.push(`/dashboard/interventions/${interventionId}/edit`)}
          className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-all"
        >
          ✏️ Modifier la planification
        </button>
      </div>
    );
  }

  // ========================================
  // CAS 2 : INTERVENTION EN COURS
  // ========================================
  if (status === 'in_progress') {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => router.push(`/dashboard/interventions/${interventionId}/photos`)}
            className="bg-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 transition-all"
          >
            📸 Photos
          </button>
          <button
            onClick={() => router.push(`/dashboard/interventions/${interventionId}/documents`)}
            className="bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-orange-700 transition-all"
          >
            📄 Documents
          </button>
        </div>

        <button
          onClick={() => router.push(`/dashboard/interventions/${interventionId}/complete`)}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all"
        >
          🏁 Terminer l'intervention
        </button>
      </>
    );
  }

  // ========================================
  // CAS 3 : INTERVENTION TERMINÉE
  // ========================================
  if (status === 'completed') {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <button
            onClick={() => router.push(`/dashboard/interventions/${interventionId}/photos`)}
            className="bg-purple-100 text-purple-800 py-4 rounded-xl font-bold text-lg hover:bg-purple-200 transition-all"
          >
            📸 Voir photos
          </button>
          <button
            onClick={() => router.push(`/dashboard/interventions/${interventionId}/documents`)}
            className="bg-orange-100 text-orange-800 py-4 rounded-xl font-bold text-lg hover:bg-orange-200 transition-all"
          >
            📄 Voir documents
          </button>
        </div>

        <div className="space-y-4">
          {/* 📧 BOUTON EMAIL DE CONFIRMATION */}
          {emailLoading ? (
            <div className="w-full bg-gray-100 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-gray-600">Vérification...</span>
            </div>
          ) : emailSent ? (
            <div className="w-full bg-green-50 border-2 border-green-200 py-4 rounded-xl font-bold text-lg flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="text-green-800">Email de confirmation envoyé</span>
              </div>
              {emailSentAt && (
                <p className="text-green-600 text-sm">
                  Envoyé le {new Date(emailSentAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={handleSendConfirmation}
              disabled={emailSending}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {emailSending ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Envoi en cours...
                </>
              ) : (
                <>📧 Envoyer confirmation au client</>
              )}
            </button>
          )}

          {/* 🧾 BOUTON FACTURE - ADAPTATIF ! */}
          {renderInvoiceButton()}

          {/* LOGIQUE DE SIGNATURE */}
          {(() => {
            if (clientPresent === true && !clientSignedAt) {
              return (
                <button
                  onClick={() => router.push(`/dashboard/interventions/${interventionId}/sign`)}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  ✍️ Faire signer le client
                </button>
              );
            }

            if (clientPresent === true && clientSignedAt) {
              return (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">✅</span>
                    <p className="text-green-800 font-semibold text-lg">
                      Client a signé
                    </p>
                  </div>
                  <p className="text-green-600 text-sm text-center">
                    Signé le {new Date(clientSignedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              );
            }

            if (clientPresent === false) {
              return (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">ℹ️</span>
                    <p className="text-blue-800 font-semibold text-lg">
                      Client absent lors de l'intervention
                    </p>
                  </div>
                  <p className="text-blue-600 text-sm text-center">
                    Email de confirmation envoyé • Paiement ultérieur
                  </p>
                </div>
              );
            }

            return (
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">❓</span>
                  <p className="text-gray-800 font-semibold text-lg">
                    Présence client non renseignée
                  </p>
                </div>
                <p className="text-gray-600 text-sm text-center">
                  Information manquante pour cette intervention
                </p>
              </div>
            );
          })()}
        </div>
      </>
    );
  }

  return null;
}
