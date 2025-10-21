'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type TaskTemplate = {
  id: string;
  name: string;
  description: string;
  estimated_duration_hours: number;
  default_price: number;
  category: string;
};

type TaskTemplateSelectorProps = {
  selectedTypes: string[];
  selectedTemplateIds: string[]; // ✅ CHANGEMENT : array au lieu de string | null
  onChange: (templates: TaskTemplate[]) => void; // ✅ CHANGEMENT : array complet
};

export function TaskTemplateSelector({
  selectedTypes,
  selectedTemplateIds,
  onChange
}: TaskTemplateSelectorProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTypes.length === 0) {
      setTemplates([]);
      onChange([]); // ✅ Reset sélection si plus de types
      return;
    }

    const fetchTemplates = async () => {
      setLoading(true);
      const supabase = createClient();

      const { data } = await supabase
        .schema('piscine_delmas_public')
        .from('task_templates')
        .select('*')
        .in('category', selectedTypes)
        .order('category')
        .order('name');

      setTemplates(data || []);
      setLoading(false);

      // ✅ Nettoyer les templates sélectionnés qui ne sont plus valides
      if (data && selectedTemplateIds.length > 0) {
        const validIds = data.map(t => t.id);
        const stillValidIds = selectedTemplateIds.filter(id => validIds.includes(id));

        if (stillValidIds.length !== selectedTemplateIds.length) {
          const validTemplates = data.filter(t => stillValidIds.includes(t.id));
          onChange(validTemplates);
        }
      }
    };

    fetchTemplates();
  }, [selectedTypes]);

  // ✅ Toggle template (ajout ou retrait)
  const toggleTemplate = (template: TaskTemplate) => {
    const isSelected = selectedTemplateIds.includes(template.id);

    if (isSelected) {
      // Retirer
      const newTemplates = templates.filter(t =>
        selectedTemplateIds.includes(t.id) && t.id !== template.id
      );
      onChange(newTemplates);
    } else {
      // Ajouter
      const newTemplates = templates.filter(t =>
        selectedTemplateIds.includes(t.id) || t.id === template.id
      );
      onChange(newTemplates);
    }
  };

  // ✅ Calcul totaux
  const selectedTemplates = templates.filter(t => selectedTemplateIds.includes(t.id));
  const totalHours = selectedTemplates.reduce((sum, t) => sum + t.estimated_duration_hours, 0);
  const totalPrice = selectedTemplates.reduce((sum, t) => sum + t.default_price, 0);

  if (selectedTypes.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-500">
          ⬆️ Sélectionnez d'abord un ou plusieurs types d'intervention
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Grouper par catégorie
  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, TaskTemplate[]>);

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
    <div className="space-y-3">
      {/* Option "Tarification personnalisée" */}
      <button
        type="button"
        onClick={() => onChange([])}
        className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-between ${
          selectedTemplateIds.length === 0
            ? 'bg-blue-50 border-blue-500 shadow-sm'
            : 'bg-white border-gray-200 hover:border-blue-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Tarification personnalisée</p>
            <p className="text-xs text-gray-500">Saisir manuellement</p>
          </div>
        </div>
        {selectedTemplateIds.length === 0 && (
          <span className="text-blue-600 font-bold text-lg">✓</span>
        )}
      </button>

      {/* ✅ Résumé templates sélectionnés */}
      {selectedTemplateIds.length > 0 && (
        <div className="bg-green-50 border-2 border-green-500 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-green-900">
              {selectedTemplateIds.length} prestation(s) sélectionnée(s)
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-green-700 hover:text-green-900 font-semibold underline"
            >
              Tout désélectionner
            </button>
          </div>
          <div className="space-y-1">
            {selectedTemplates.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs">
                <span className="text-green-800">• {t.name}</span>
                <span className="text-green-600 font-semibold">
                  {t.estimated_duration_hours}h · {t.default_price.toFixed(0)}€
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-green-300 mt-2 pt-2 flex items-center justify-between">
            <span className="text-sm font-bold text-green-900">TOTAL</span>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-blue-600">⏱️ {totalHours}h</span>
              <span className="text-sm font-bold text-green-600">💰 {totalPrice.toFixed(2)}€</span>
            </div>
          </div>
        </div>
      )}

      {/* Templates - AFFICHAGE COMPACT EN GRILLE */}
      {Object.keys(groupedTemplates).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-200"></div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Prestations standards
            </p>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>

          {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
            <div key={category} className="space-y-2">
              {/* Header catégorie */}
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                {typeLabels[category] || category}
              </p>

              {/* Templates en GRILLE COMPACTE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {categoryTemplates.map((template) => {
                  const isSelected = selectedTemplateIds.includes(template.id);
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => toggleTemplate(template)}
                      className={`text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'bg-green-50 border-green-500 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {template.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">
                              <span>⏱️</span>
                              {template.estimated_duration_hours}h
                            </span>
                            <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                              <span>💰</span>
                              {template.default_price.toFixed(0)}€
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-green-600 font-bold text-lg flex-shrink-0">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Message si aucun template disponible */}
      {Object.keys(groupedTemplates).length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-center">
          <p className="text-sm font-semibold text-yellow-800">
            Aucune prestation standard pour ces types
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Utilisez la tarification personnalisée
          </p>
        </div>
      )}
    </div>
  );
}
