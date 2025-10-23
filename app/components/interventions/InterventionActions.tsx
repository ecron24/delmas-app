'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type InterventionActionsProps = {
  interventionId: string;
  status: string;
  clientPresent: boolean | null;
  clientSignedAt: string | null;
};

export function InterventionActions({
  interventionId,
  status,
  clientPresent,
  clientSignedAt
}: InterventionActionsProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

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
    if (!confirm('📧 Envoyer l\'email de confirmation au client ?')) return;

    const response = await fetch(`/api/interventions/${interventionId}/send-confirmation`, {
      method: 'POST',
    });

    if (response.ok) {
      alert('✅ Email envoyé !');
    } else {
      alert('❌ Erreur lors de l\'envoi');
    }
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
          <button
            onClick={handleSendConfirmation}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
          >
            📧 Envoyer confirmation au client
          </button>

          <button
            onClick={() => router.push(`/dashboard/interventions/${interventionId}/invoice`)}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-purple-700 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
          >
            📄 Gérer facture proforma (Interne)
          </button>

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
