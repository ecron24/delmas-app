// /lib/constants.ts

// ========================================
// 🎨 TYPES D'INTERVENTION
// ========================================
export const INTERVENTION_TYPES = {
  maintenance: 'Entretien',
  repair: 'Réparation',
  installation: 'Installation',
  emergency: 'Urgence',
  diagnostic: 'Diagnostic',
  cleaning: 'Nettoyage',
  winterization: 'Hivernage',
  recommissioning: 'Remise en service',
  other: 'Autre'
} as const;

export type InterventionType = keyof typeof INTERVENTION_TYPES;

// ========================================
// 🎨 CONFIG UI DES TYPES (avec émojis)
// ========================================
export const INTERVENTION_TYPE_CONFIG = {
  maintenance: { emoji: '🔧', label: 'Entretien', color: 'blue' },
  repair: { emoji: '🛠️', label: 'Réparation', color: 'orange' },
  installation: { emoji: '⚙️', label: 'Installation', color: 'purple' },
  emergency: { emoji: '🚨', label: 'Urgence', color: 'red' },
  diagnostic: { emoji: '🔍', label: 'Diagnostic', color: 'green' },
  cleaning: { emoji: '🧹', label: 'Nettoyage', color: 'cyan' },
  winterization: { emoji: '❄️', label: 'Hivernage', color: 'indigo' },
  recommissioning: { emoji: '🌊', label: 'Remise en service', color: 'teal' },
  other: { emoji: '📋', label: 'Autre', color: 'gray' },
} as const;

// ========================================
// 🎨 STATUTS D'INTERVENTION
// ========================================
export const INTERVENTION_STATUSES = {
  draft: 'Brouillon',
  scheduled: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
  invoiced: 'Facturée',
  cancelled: 'Annulée',
} as const;

export type InterventionStatus = keyof typeof INTERVENTION_STATUSES;
