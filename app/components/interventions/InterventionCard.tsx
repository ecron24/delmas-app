'use client';

import { useRouter } from 'next/navigation';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  type: string;
};

type Intervention = {
  id: string;
  reference: string;
  status: string;
  scheduled_date: string;
  description: string;
  client_id: string;
  client: Client;
  total_ttc: number;
  intervention_types_junction: Array<{ intervention_type: string }>;
  synced_to_gcal?: boolean;        // ✅ Ajouté
  created_from?: 'app' | 'gcal';   // ✅ Ajouté
};

export function InterventionCard({ intervention }: { intervention: Intervention }) {
  const router = useRouter();

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    invoiced: 'bg-purple-100 text-purple-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    draft: 'Brouillon',
    scheduled: 'Planifiée',
    in_progress: 'En cours',
    completed: 'Terminée',
    invoiced: 'Facturée',
    cancelled: 'Annulée',
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

  const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
    ? intervention.client.company_name
    : `${intervention.client?.first_name || ''} ${intervention.client?.last_name || ''}`.trim();

  const types = intervention.intervention_types_junction?.map(t => t.intervention_type) || [];

  return (
    <button
      onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
      className="w-full bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md hover:border-blue-500 transition-all active:scale-98 text-left"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0"> {/* ✅ Ajouté min-w-0 pour éviter débordement */}
          <h3 className="font-bold text-gray-900 text-lg truncate">{clientName || 'Client inconnu'}</h3>
          <p className="text-xs text-gray-400 mt-1">{intervention.reference}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${statusColors[intervention.status]}`}>
          {statusLabels[intervention.status] || intervention.status}
        </span>
      </div>

      {/* Types */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {types.map((type, index) => (
            <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
              {typeLabels[type] || type}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {intervention.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {intervention.description}
        </p>
      )}

      {/* Date + Badges sync */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
        </span>

        {/* Badge Google Calendar Sync */}
        {intervention.synced_to_gcal && (
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
            📆 Sync
          </span>
        )}

        {/* Badge intervention créée depuis Google Calendar */}
        {intervention.created_from === 'gcal' && (
          <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            🔗 GCal
          </span>
        )}
      </div>

      {/* Footer - Prix uniquement */}
      {intervention.total_ttc > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <div className="text-right">
            <span className="text-lg font-bold text-green-600">
              {intervention.total_ttc.toFixed(2)} €
            </span>
          </div>
        </div>
      )}
    </button>
  );
}
