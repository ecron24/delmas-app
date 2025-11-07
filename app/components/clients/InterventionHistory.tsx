'use client';

import { useRouter } from 'next/navigation';

type Intervention = {
  id: string;
  scheduled_date: string;
  status: string;
  description: string;
  intervention_types: Array<{ intervention_type: string }>;
  has_final_invoice?: boolean;
};

type InterventionHistoryProps = {
  interventions: Intervention[];
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: '📅 Planifiée',
  in_progress: '⏳ En cours',
  completed: '✅ Terminée',
  cancelled: '❌ Annulée',
};

const TYPE_LABELS: Record<string, string> = {
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

export function InterventionHistory({ interventions }: InterventionHistoryProps) {
  const router = useRouter();

  if (interventions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
        <p className="text-5xl mb-4">📭</p>
        <p className="text-gray-600">Aucune intervention enregistrée</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {interventions.map((intervention) => {
        const isFinalInvoice = intervention.has_final_invoice;

        return (
          <button
            key={intervention.id}
            onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
            className="w-full bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all text-left"
          >
            {/* Contenu principal */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                  📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                </span>
                <span className="text-xs md:text-sm">{STATUS_LABELS[intervention.status]}</span>
                {isFinalInvoice && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                    🧾 Facturée
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {intervention.intervention_types.map((t, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                    {TYPE_LABELS[t.intervention_type] || t.intervention_type}
                  </span>
                ))}
              </div>

              <p className="text-sm text-gray-600 line-clamp-2">
                {intervention.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
