// lib/types/intervention.ts

export type Intervention = {
  id: string;
  reference: string;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  total_ttc: number;
  client_present: boolean | null;
  client_signed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    type: string;
    address: string | null;
    postal_code: string | null;
    city: string | null;
    phone: string | null;
    mobile: string | null;
  } | null;
  intervention_types: Array<{ intervention_type: string }>;
};

export const STATUS_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  scheduled: { label: 'Planifiée', color: 'bg-blue-100 text-blue-800', emoji: '📅' },
  in_progress: { label: 'En cours', color: 'bg-orange-100 text-orange-800', emoji: '⏳' },
  completed: { label: 'Terminée', color: 'bg-green-100 text-green-800', emoji: '✅' },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-800', emoji: '❌' },
};

export const TYPE_LABELS: Record<string, string> = {
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
