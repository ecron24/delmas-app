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

      // Mise à jour de l'intervention
      const { error: updateError } = await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          client_present: clientPresent,
        })
        .eq('id', params.id);

      if (updateError) {
        console.error('Erreur Supabase:', updateError);
        throw updateError;
      }

      // Redirection selon le choix
      if (clientPresent) {
        // Client présent → Page signature
        router.push(`/dashboard/interventions/${params.id}/sign`);
      } else {
        // Client absent → Retour à la fiche
        alert('✅ Intervention terminée ! La fiche sera envoyée au client par email.');
        router.push(`/dashboard/interventions/${params.id}`);
      }

    } catch (error: any) {
      console.error('Erreur complète:', error);
      alert(`❌ Erreur : ${error?.message || 'Erreur inconnue'}`);
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
              <p className="text-green-100 text-sm">Faire valider la fiche</p>
            </div>
          </button>

          <button
            onClick={() => handleComplete(false)}
            disabled={loading}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            <div className="relative z-10">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-2xl font-bold mb-2">Client absent</h3>
              <p className="text-blue-100 text-sm">Envoyer par email</p>
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
