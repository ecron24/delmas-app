'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CompleteInterventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

        // 🆕 Notifier Google Calendar
        try {
          await fetch(`/api/interventions/${params.id}/notify-completion`, {
            method: 'POST',
          });
          console.log('✅ Google Calendar mis à jour');
        } catch (err) {
          console.warn('⚠️ Erreur mise à jour Google Calendar (non bloquant):', err);
        }

        // Envoyer l'email de confirmation
        try {
          const emailResponse = await fetch(`/api/interventions/${params.id}/send-confirmation`, {
            method: 'POST',
          });

          if (!emailResponse.ok) {
            console.warn('Échec envoi email, mais intervention validée');
          }
        } catch (err) {
          console.warn('⚠️ Erreur envoi email (non bloquant):', err);
        }

        alert('✅ Intervention terminée ! Email envoyé + Google Calendar mis à jour.');
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
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-center mb-2">
          🏁 Terminer l'intervention
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Le client était-il présent sur place ?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => handleComplete(true)}
            disabled={loading}
            className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            <div className="relative z-10">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-2xl font-bold mb-2">Client présent</h3>
              <p className="text-green-100 text-sm">Faire signer maintenant</p>
            </div>
          </button>

          <button
            onClick={() => handleComplete(false)}
            disabled={loading}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            <div className="relative z-10">
              <div className="text-6xl mb-4">📧</div>
              <h3 className="text-2xl font-bold mb-2">Client absent</h3>
              <p className="text-blue-100 text-sm">Terminer et envoyer email</p>
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
    </div>
  );
}
