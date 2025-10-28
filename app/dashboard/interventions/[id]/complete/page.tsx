'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CompleteInterventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);
  const [onHoldReason, setOnHoldReason] = useState('');

  const handlePutOnHold = async () => {
    if (!onHoldReason.trim()) {
      alert('⚠️ Veuillez indiquer la raison de la mise en attente');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .update({
          status: 'in_progress', // Remettre en cours
          on_hold_reason: onHoldReason,
          on_hold_at: new Date().toISOString(),
          on_hold_by: user?.id,
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      alert('⏸️ Intervention mise en attente.\nVous pourrez la reprendre plus tard.');
      router.push('/dashboard/interventions');

    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`❌ Erreur : ${error?.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (clientPresent: boolean) => {
    setLoading(true);

    try {
      const supabase = createClient();

      if (clientPresent) {
        // CAS 1 : Client présent → Aller à la signature
        const { error: updateError } = await supabase
          .schema('piscine_delmas_public')
          .from('interventions')
          .update({
            client_present: true,
          })
          .eq('id', params.id);

        if (updateError) throw updateError;

        router.push(`/dashboard/interventions/${params.id}/sign`);

      } else {
        // CAS 2 : Client absent → Marquer completed + envoyer email + notifier Google Calendar
        const { error: updateError } = await supabase
          .schema('piscine_delmas_public')
          .from('interventions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            client_present: false,
            client_signed_at: null,
          })
          .eq('id', params.id);

        if (updateError) throw updateError;

        // Suivre les succès/échecs
        let calendarSuccess = false;
        let emailSuccess = false;
        const errors: string[] = [];

        // 🆕 Notifier Google Calendar
        try {
          const calendarResponse = await fetch(`/api/interventions/${params.id}/notify-completion`, {
            method: 'POST',
          });

          if (calendarResponse.ok) {
            const data = await calendarResponse.json();
            calendarSuccess = data.success || false;
            console.log('✅ Google Calendar:', data);
          } else {
            const errorData = await calendarResponse.json();
            errors.push(`Calendar: ${errorData.error || 'Erreur inconnue'}`);
            console.error('❌ Erreur Calendar:', errorData);
          }
        } catch (err: any) {
          errors.push(`Calendar: ${err.message}`);
          console.error('⚠️ Erreur mise à jour Google Calendar:', err);
        }

        // Envoyer l'email de confirmation
        try {
          const emailResponse = await fetch(`/api/interventions/${params.id}/send-confirmation`, {
            method: 'POST',
          });

          if (emailResponse.ok) {
            const data = await emailResponse.json();
            emailSuccess = data.success || false;
            console.log('✅ Email:', data);
          } else {
            const errorData = await emailResponse.json();
            errors.push(`Email: ${errorData.error || 'Erreur inconnue'}`);
            console.error('❌ Erreur Email:', errorData);
          }
        } catch (err: any) {
          errors.push(`Email: ${err.message}`);
          console.error('⚠️ Erreur envoi email:', err);
        }

        // Message de feedback détaillé
        let message = '✅ Intervention marquée comme terminée.\n\n';

        if (calendarSuccess) {
          message += '✅ Google Calendar mis à jour\n';
        } else {
          message += '⚠️ Google Calendar non mis à jour\n';
        }

        if (emailSuccess) {
          message += '✅ Email envoyé au client\n';
        } else {
          message += '⚠️ Email non envoyé\n';
        }

        if (errors.length > 0) {
          message += '\n⚠️ Erreurs:\n' + errors.join('\n');
        }

        alert(message);
        router.push(`/dashboard/interventions/${params.id}`);
      }

    } catch (error: any) {
      console.error('Erreur:', error);
      alert(`❌ Erreur : ${error?.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl w-full">
        <h1 className="text-3xl font-bold text-center mb-2">
          🏁 Terminer l'intervention
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Choisissez l'action appropriée
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Client présent */}
          <button
            onClick={() => handleComplete(true)}
            disabled={loading}
            className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            <div className="relative z-10">
              <div className="text-5xl mb-3">👤</div>
              <h3 className="text-xl font-bold mb-2">Client présent</h3>
              <p className="text-green-100 text-xs">Faire signer maintenant</p>
            </div>
          </button>

          {/* Client absent */}
          <button
            onClick={() => handleComplete(false)}
            disabled={loading}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            <div className="relative z-10">
              <div className="text-5xl mb-3">📧</div>
              <h3 className="text-xl font-bold mb-2">Client absent</h3>
              <p className="text-blue-100 text-xs">Terminer et envoyer email</p>
            </div>
          </button>

          {/* Mettre en attente */}
          <button
            onClick={() => setShowOnHoldModal(true)}
            disabled={loading}
            className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            <div className="relative z-10">
              <div className="text-5xl mb-3">⏸️</div>
              <h3 className="text-xl font-bold mb-2">Mettre en attente</h3>
              <p className="text-orange-100 text-xs">Reprendre plus tard</p>
            </div>
          </button>
        </div>

        <button
          onClick={() => router.back()}
          disabled={loading}
          className="w-full mt-6 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          ← Retour
        </button>

        {loading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-2">Traitement en cours...</p>
          </div>
        )}
      </div>

      {/* Modal de mise en attente */}
      {showOnHoldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              ⏸️ Mettre l'intervention en attente
            </h2>
            <p className="text-gray-600 mb-6">
              Indiquez la raison de la mise en attente pour référence future :
            </p>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Raison de la mise en attente *
              </label>
              <textarea
                value={onHoldReason}
                onChange={(e) => setOnHoldReason(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none resize-none"
                rows={5}
                placeholder="Ex: Manque d'eau dans la piscine, appareil défectueux à remplacer, traitement en plusieurs fois..."
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Exemples : Manque d'eau • Appareil défectueux • Traitement en plusieurs fois
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOnHoldModal(false);
                  setOnHoldReason('');
                }}
                disabled={loading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handlePutOnHold}
                disabled={loading || !onHoldReason.trim()}
                className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
