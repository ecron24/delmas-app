'use client';

type InterventionTypeSelectorProps = {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
};

const INTERVENTION_TYPES = [
  { value: 'maintenance', label: '🔧 Entretien', color: 'blue' },
  { value: 'repair', label: '🛠️ Réparation', color: 'orange' },
  { value: 'installation', label: '⚙️ Installation', color: 'purple' },
  { value: 'emergency', label: '🚨 Urgence', color: 'red' },
  { value: 'diagnostic', label: '🔍 Diagnostic', color: 'green' },
  { value: 'cleaning', label: '🧹 Nettoyage', color: 'cyan' },
  { value: 'winterization', label: '❄️ Hivernage', color: 'indigo' },
  { value: 'startup', label: '🌊 Remise en service', color: 'teal' },
  { value: 'other', label: '📋 Autre', color: 'gray' },
];

export function InterventionTypeSelector({ selectedTypes, onChange }: InterventionTypeSelectorProps) {
  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter(t => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {INTERVENTION_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type.value);
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleType(type.value)}
              className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          );
        })}
      </div>

      {selectedTypes.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-2">
          Sélectionnez au moins un type d'intervention
        </p>
      )}

      {selectedTypes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-blue-900">
            {selectedTypes.length} type(s) sélectionné(s)
          </p>
        </div>
      )}
    </div>
  );
}
