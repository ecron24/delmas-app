'use client';

import { useRouter } from 'next/navigation';
import { INTERVENTION_TYPE_CONFIG, InterventionType } from '@/lib/constants';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  company_name: string | null;
  type: string;
  address: string | null;
  city: string | null;
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
  synced_to_gcal?: boolean;
  created_from?: 'app' | 'gcal';
};

export function InterventionCard({ intervention }: { intervention: Intervention }) {
  const router = useRouter();

  // ========================================
  // 🎨 CONFIGURATION DES STATUTS
  // ========================================
  const statusConfig: Record<string, {
    label: string;
    emoji: string;
    badgeClass: string;
    cardClass: string;
    actionLabel: string;
  }> = {
    scheduled: {
      label: 'Planifiée',
      emoji: '📅',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      cardClass: 'border-blue-200 hover:border-blue-400 hover:shadow-blue-100',
      actionLabel: 'Démarrer →'
    },
    in_progress: {
      label: 'En cours',
      emoji: '⏳',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
      cardClass: 'border-orange-200 hover:border-orange-400 hover:shadow-orange-100',
      actionLabel: 'Continuer →'
    },
    completed: {
      label: 'Terminée',
      emoji: '✅',
      badgeClass: 'bg-green-100 text-green-800 border-green-200',
      cardClass: 'border-green-200 hover:border-green-400 hover:shadow-green-100',
      actionLabel: 'Voir détails →'
    },
    invoiced: {
      label: 'Facturée',
      emoji: '💼',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      cardClass: 'border-purple-200 hover:border-purple-400 hover:shadow-purple-100',
      actionLabel: 'Voir détails →'
    },
    cancelled: {
      label: 'Annulée',
      emoji: '❌',
      badgeClass: 'bg-red-100 text-red-800 border-red-200',
      cardClass: 'border-red-200 hover:border-red-400 hover:shadow-red-100 opacity-75',
      actionLabel: 'Voir détails →'
    },
    draft: {
      label: 'Brouillon',
      emoji: '📝',
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-200',
      cardClass: 'border-gray-200 hover:border-gray-400 hover:shadow-gray-100',
      actionLabel: 'Compléter →'
    }
  };

  const currentStatus = statusConfig[intervention.status] || statusConfig.scheduled;
  const types = intervention.intervention_types_junction?.map(t => t.intervention_type) || [];

  const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
    ? intervention.client.company_name
    : `${intervention.client?.first_name || ''} ${intervention.client?.last_name || ''}`.trim();

  // ========================================
  // 🎯 FORMAT DE LA DATE
  // ========================================
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const interventionDate = new Date(date);
    interventionDate.setHours(0, 0, 0, 0);

    if (interventionDate.getTime() === today.getTime()) {
      return {
        text: "Aujourd'hui",
        class: 'bg-red-500 text-white animate-pulse'
      };
    } else if (interventionDate.getTime() === tomorrow.getTime()) {
      return {
        text: 'Demain',
        class: 'bg-orange-500 text-white'
      };
    } else {
      return {
        text: date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short'
        }),
        class: 'bg-blue-100 text-blue-800'
      };
    }
  };

  const dateInfo = formatDate(intervention.scheduled_date);

  return (
    <button
      onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
      className={`w-full bg-white rounded-xl shadow-sm p-5 border-2 hover:shadow-lg transition-all active:scale-[0.98] text-left ${currentStatus.cardClass}`}
    >
      {/* ========================================
          HEADER : Client + Statut
          ======================================== */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">
              {intervention.client?.type === 'professionnel' ? '🏢' : '👤'}
            </span>
            <h3 className="font-bold text-gray-900 text-lg truncate">
              {clientName || 'Client inconnu'}
            </h3>
          </div>
          <p className="text-xs text-gray-400">{intervention.reference}</p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${currentStatus.badgeClass}`}>
            {currentStatus.emoji} {currentStatus.label}
          </span>
        </div>
      </div>

      {/* ========================================
          TYPES D'INTERVENTION
          ======================================== */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {types.slice(0, 3).map((type, index) => {
            const config = INTERVENTION_TYPE_CONFIG[type as InterventionType];
            return (
              <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-semibold border border-gray-200">
                {config ? `${config.emoji} ${config.label}` : type}
              </span>
            );
          })}
          {types.length > 3 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-semibold border border-gray-200">
              +{types.length - 3}
            </span>
          )}
        </div>
      )}

      {/* ========================================
          DESCRIPTION
          ======================================== */}
      {intervention.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {intervention.description}
        </p>
      )}

      {/* ========================================
          ADRESSE (si planifiée ou en cours)
          ======================================== */}
      {(intervention.status === 'scheduled' || intervention.status === 'in_progress') &&
       intervention.client?.address && (
        <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-2">
            <span className="text-base">📍</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-700 truncate">
                {intervention.client.address}
              </p>
              {intervention.client.city && (
                <p className="text-xs text-gray-500">
                  {intervention.client.city}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================
          FOOTER : Date + Badges + Prix
          ======================================== */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* Date + Badges sync */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${dateInfo.class}`}>
              📅 {dateInfo.text}
            </span>

            {/* Badge Google Calendar Sync */}
            {intervention.synced_to_gcal && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                📆
              </span>
            )}

            {/* Badge intervention créée depuis Google Calendar */}
            {intervention.created_from === 'gcal' && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                🔗
              </span>
            )}
          </div>

          {/* Prix (si renseigné) */}
          {intervention.total_ttc > 0 && (
            <div className="text-right ml-3">
              <span className="text-lg font-bold text-green-600">
                {intervention.total_ttc.toFixed(2)}€
              </span>
            </div>
          )}
        </div>

        {/* ========================================
            CALL TO ACTION (selon statut)
            ======================================== */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">
              {currentStatus.actionLabel}
            </span>

            {/* Indicateur visuel selon statut */}
            {intervention.status === 'scheduled' && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                Prête à démarrer
              </span>
            )}

            {intervention.status === 'in_progress' && (
              <span className="flex items-center gap-1 text-orange-600 font-semibold">
                <span className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></span>
                En cours
              </span>
            )}

            {intervention.status === 'completed' && (
              <span className="text-green-600 font-semibold">
                ✓ Terminée
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
