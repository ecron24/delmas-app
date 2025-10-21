'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ClientPhotos } from '@/components/clients/ClientPhotos';

type Client = {
  id: string;
  type: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  notes: string | null;
};

type Intervention = {
  id: string;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  intervention_types: Array<{ intervention_type: string }>;
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, [params.id]);

  const fetchClientData = async () => {
    const supabase = createClient();

    const { data: clientData } = await supabase
      .schema('piscine_delmas_public')
      .from('clients')
      .select('*')
      .eq('id', params.id)
      .single();

    const { data: interventionsData } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        *,
        intervention_types:intervention_types_junction(intervention_type)
      `)
      .eq('client_id', params.id)
      .order('scheduled_date', { ascending: false });

    setClient(clientData);
    setInterventions(interventionsData || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-2 border-red-500 rounded-xl p-6 text-center">
          <p className="text-red-900 font-bold">Client introuvable</p>
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

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      {/* Infos client */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 md:p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl md:text-4xl">
              {client.type === 'professionnel' ? '🏢' : '👤'}
            </span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {client.type === 'professionnel' && client.company_name
                  ? client.company_name
                  : `${client.first_name} ${client.last_name}`}
              </h1>
              {client.type === 'professionnel' && client.company_name && (
                <p className="text-sm md:text-base text-gray-600">
                  Contact: {client.first_name} {client.last_name}
                </p>
              )}
            </div>
          </div>

          {/* Bouton Modifier responsive */}
          <button
            onClick={() => router.push(`/dashboard/clients/${client.id}/edit`)}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm flex items-center gap-1 shrink-0"
          >
            <span>✏️</span>
            <span className="hidden sm:inline">Modifier</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {client.email && (
            <div>
              <p className="text-gray-500 font-semibold">Email</p>
              <p className="text-gray-900">📧 {client.email}</p>
            </div>
          )}
          {(client.phone || client.mobile) && (
            <div>
              <p className="text-gray-500 font-semibold">Téléphone</p>
              <p className="text-gray-900">
                {client.phone && `📞 ${client.phone}`}
                {client.phone && client.mobile && ' • '}
                {client.mobile && `📱 ${client.mobile}`}
              </p>
            </div>
          )}
          {(client.address || client.city) && (
            <div className="md:col-span-2">
              <p className="text-gray-500 font-semibold">Adresse</p>
              <p className="text-gray-900">
                📍 {client.address}
                {client.postal_code && `, ${client.postal_code}`}
                {client.city && ` ${client.city}`}
              </p>
            </div>
          )}
          {client.notes && (
            <div className="md:col-span-2">
              <p className="text-gray-500 font-semibold">Notes</p>
              <p className="text-gray-900">💬 {client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bouton nouvelle intervention */}
      <button
        onClick={() => router.push(`/dashboard/interventions/new?client=${client.id}`)}
        className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-3 rounded-xl font-bold shadow-lg hover:from-green-700 hover:to-green-600 transition-all flex items-center justify-center gap-2"
      >
        <span className="text-xl">➕</span>
        <span className="text-base">Nouvelle intervention</span>
      </button>

      {/* Section Photos */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 md:p-6">
        <ClientPhotos clientId={client.id} />
      </div>

      {/* Historique interventions */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
          📋 Historique des interventions ({interventions.length})
        </h2>

        {interventions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-gray-600">Aucune intervention enregistrée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interventions.map((intervention) => {
              const total = (intervention.labor_hours || 0) * (intervention.labor_rate || 0) + (intervention.travel_fee || 0);

              return (
                <button
                  key={intervention.id}
                  onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
                  className="w-full bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Contenu principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-xs md:text-sm">{statusLabels[intervention.status]}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {intervention.intervention_types.map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                            {typeLabels[t.intervention_type] || t.intervention_type}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2">
                        {intervention.description}
                      </p>
                    </div>

                    {/* Prix responsive */}
                    {total > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-lg md:text-2xl font-bold text-green-600 whitespace-nowrap">
                          {total.toFixed(2)}€
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
