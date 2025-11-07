'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function CompleteInterventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showOnHoldModal, setShowOnHoldModal] = useState(false);
  const [onHoldReasonType, setOnHoldReasonType] = useState<string>('');
  const [onHoldReasonDetails, setOnHoldReasonDetails] = useState('');

  const handlePutOnHold = async () => {
    if (!onHoldReasonType) {
      alert('⚠️ Veuillez sélectionner une raison de mise en attente');
      return;
    }

    if (onHoldReasonType === 'defective_equipment' && !onHoldReasonDetails.trim()) {
      alert('⚠️ Veuillez préciser quel appareil est défectueux');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Récupérer l'utilisateur actuel
      const { data: { user } } = await supabase.auth.getUser();

      // Construire le message de raison
      const reasonLabels: Record<string, string> = {
        'missing_water': 'Manque d\'eau dans la piscine',
        'defective_equipment': 'Appareil défectueux',
        'multi_phase_treatment': 'Bassin à traiter en plusieurs fois',
      };

      let finalReason = reasonLabels[onHoldReasonType] || onHoldReasonType;
      if (onHoldReasonType === 'defective_equipment' && onHoldReasonDetails.trim()) {
        finalReason += ` : ${onHoldReasonDetails}`;
      }

      const { error: updateError } = await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .update({
          status: 'in_progress', // Remettre en cours
          on_hold_reason: finalReason,
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
        // CAS 2 : Client absent → Marquer completed + Google Calendar SEULEMENT
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

        // 📅 Mise à jour Google Calendar (en arrière-plan, sans bloquer)
        fetch(`/api/interventions/${params.id}/notify-completion`, {
          method: 'POST',
        }).then(response => {
          if (response.ok) {
            console.log('✅ Google Calendar mis à jour');
          } else {
            console.warn('⚠️ Erreur mise à jour Google Calendar');
          }
        }).catch(err => {
          console.warn('⚠️ Erreur mise à jour Google Calendar:', err);
        });

        // 🎯 FORCER LE RECHARGEMENT DES DONNÉES
        // Option 1 : Invalider le cache de Next.js
        router.refresh();

        // Option 2 : Rediriger avec un timestamp pour forcer le rechargement
        const timestamp = Date.now();
        router.push(`/dashboard/interventions/${params.id}?t=${timestamp}`);
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
              Sélectionnez la raison de la mise en attente :
            </p>

            <div className="mb-6 space-y-3">
              {/* Option 1 : Manque d'eau */}
              <label className="flex items-start p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="onHoldReason"
                  value="missing_water"
                  checked={onHoldReasonType === 'missing_water'}
                  onChange={(e) => setOnHoldReasonType(e.target.value)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                />
                <div className="ml-3 flex-1">
                  <span className="font-semibold text-gray-900">💧 Manque d'eau dans la piscine</span>
                </div>
              </label>

              {/* Option 2 : Appareil défectueux */}
              <label className="flex items-start p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="onHoldReason"
                  value="defective_equipment"
                  checked={onHoldReasonType === 'defective_equipment'}
                  onChange={(e) => setOnHoldReasonType(e.target.value)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                />
                <div className="ml-3 flex-1">
                  <span className="font-semibold text-gray-900">🔧 Appareil défectueux</span>
                </div>
              </label>

              {/* Textarea conditionnelle pour appareil défectueux */}
              {onHoldReasonType === 'defective_equipment' && (
                <div className="ml-7 mt-3">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Précisez quel appareil *
                  </label>
                  <textarea
                    value={onHoldReasonDetails}
                    onChange={(e) => setOnHoldReasonDetails(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none resize-none"
                    rows={3}
                    placeholder="Ex: Pompe de filtration, électrolyseur, robot nettoyeur..."
                    disabled={loading}
                  />
                </div>
              )}

              {/* Option 3 : Traitement en plusieurs fois */}
              <label className="flex items-start p-4 border-2 border-gray-300 rounded-xl cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="onHoldReason"
                  value="multi_phase_treatment"
                  checked={onHoldReasonType === 'multi_phase_treatment'}
                  onChange={(e) => setOnHoldReasonType(e.target.value)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                />
                <div className="ml-3 flex-1">
                  <span className="font-semibold text-gray-900">🔄 Bassin à traiter en plusieurs fois</span>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowOnHoldModal(false);
                  setOnHoldReasonType('');
                  setOnHoldReasonDetails('');
                }}
                disabled={loading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handlePutOnHold}
                disabled={loading || !onHoldReasonType || (onHoldReasonType === 'defective_equipment' && !onHoldReasonDetails.trim())}
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
