'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Intervention = {
  id: string;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  client_present: boolean | null; // ← AJOUTER
  client_signed_at: string | null; // ← AJOUTER
  client: {
    id: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    type: string;
  } | null;
  intervention_types: Array<{ intervention_type: string }>;
};

export default function InterventionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntervention();
  }, [params.id]);

  const fetchIntervention = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        *,
        client:clients(id, first_name, last_name, company_name, type),
        intervention_types:intervention_types_junction(intervention_type)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Erreur:', error);
    }

    setIntervention(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 text-center">
          <p className="text-red-900 font-bold">Intervention introuvable</p>
        </div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    scheduled: '📅 Planifiée',
    in_progress: '⏳ En cours',
    completed: '✅ Terminée',
    cancelled: '❌ Annulée',
  };

  const typeLabels: Record<string, string> = {
    maintenance: '🔧 Entretien',
    repair: '🛠️ Réparation',
    installation: '⚙️ Installation',
    emergency: '🚨 Urgence',
    diagnostic: '🔍 Diagnostic',
    cleaning: '🧹 Nettoyage',
    winterization: '❄️ Hivernage',
    startup: '🌊 Remise en service',
    other: '📋 Autre',
  };

  const total = (intervention.labor_hours || 0) * (intervention.labor_rate || 0) + (intervention.travel_fee || 0);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      {/* Infos intervention */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 mb-6">
        {/* En-tête */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-4 py-2 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
                📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
              </span>
              <span className="text-lg">{statusLabels[intervention.status]}</span>
            </div>

            {/* Client */}
            {intervention.client && (
              <button
                onClick={() => router.push(`/dashboard/clients/${intervention.client!.id}`)}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-2 mt-2"
              >
                <span className="text-xl">
                  {intervention.client.type === 'professionnel' ? '🏢' : '👤'}
                </span>
                {intervention.client.type === 'professionnel' && intervention.client.company_name
                  ? intervention.client.company_name
                  : `${intervention.client.first_name} ${intervention.client.last_name}`}
              </button>
            )}
          </div>

                  <button
          onClick={() => router.push(`/dashboard/interventions/${intervention.id}/edit`)}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 shrink-0"
        >
          <span>✏️</span>
          <span className="hidden sm:inline">Modifier</span>
        </button>
          </div>

        {/* Types d'intervention */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Types d'intervention</h3>
          <div className="flex flex-wrap gap-2">
            {intervention.intervention_types.map((t, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 rounded-lg text-sm font-semibold">
                {typeLabels[t.intervention_type] || t.intervention_type}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        {intervention.description && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-900 whitespace-pre-wrap">{intervention.description}</p>
          </div>
        )}

        {/* Détails */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
          {intervention.labor_hours && (
            <div>
              <p className="text-gray-500 text-sm font-semibold">Durée</p>
              <p className="text-gray-900 font-bold">{intervention.labor_hours}h</p>
            </div>
          )}
          {intervention.labor_rate && (
            <div>
              <p className="text-gray-500 text-sm font-semibold">Taux horaire</p>
              <p className="text-gray-900 font-bold">{intervention.labor_rate}€/h</p>
            </div>
          )}
          {intervention.travel_fee > 0 && (
            <div>
              <p className="text-gray-500 text-sm font-semibold">Frais déplacement</p>
              <p className="text-gray-900 font-bold">{intervention.travel_fee}€</p>
            </div>
          )}
        </div>

        {/* Total */}
        {total > 0 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-900">TOTAL</span>
              <span className="text-3xl font-bold text-green-600">{total.toFixed(2)}€</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <button
          onClick={() => router.push(`/dashboard/interventions/${intervention.id}/photos`)}
          className="bg-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 transition-all"
        >
          📸 Photos
        </button>
        <button
          onClick={() => router.push(`/dashboard/interventions/${intervention.id}/documents`)}
          className="bg-orange-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-orange-700 transition-all"
        >
          📄 Documents
        </button>
      </div>

      {/* Section conditionnelle selon le statut */}
      <div className="space-y-4">
        {/* Bouton Terminer l'intervention (si status = in_progress ou scheduled) */}
        {(intervention.status === 'in_progress' || intervention.status === 'scheduled') && (
          <button
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}/complete`)}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all"
          >
            🏁 Terminer l'intervention
          </button>
        )}

        {/* Bouton Faire signer (si completed + client_present + pas encore signé) */}
        {intervention.status === 'completed' &&
         intervention.client_present === true &&
         !intervention.client_signed_at && (
          <button
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}/sign`)}
            className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-purple-700 transition-all"
          >
            ✍️ Faire signer le client
          </button>
        )}

        {/* Badge signature OK */}
        {intervention.status === 'completed' &&
         intervention.client_present === true &&
         intervention.client_signed_at && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-semibold">
              ✅ Client a signé
            </p>
            <p className="text-green-600 text-sm mt-1">
              Signé le {new Date(intervention.client_signed_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        )}

        {/* Badge si client était absent */}
        {intervention.status === 'completed' && intervention.client_present === false && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
            <p className="text-blue-800 font-semibold">
              ℹ️ Client absent lors de l'intervention
            </p>
            <p className="text-blue-600 text-sm mt-1">
              Fiche envoyée par email sans signature
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
