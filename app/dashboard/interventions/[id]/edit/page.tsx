'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type InterventionData = {
  id: string;
  client_id: string;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
};

export default function EditInterventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [interventionData, setInterventionData] = useState<InterventionData>({
    id: '',
    client_id: '',
    scheduled_date: '',
    status: 'scheduled',
    description: '',
    labor_hours: null,
    labor_rate: null,
    travel_fee: 0,
  });

  useEffect(() => {
    fetchIntervention();
  }, [params.id]);

  const fetchIntervention = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select('*')
      .eq('id', params.id)
      .single();

    if (data) {
      setInterventionData({
        ...data,
        scheduled_date: data.scheduled_date ? new Date(data.scheduled_date).toISOString().split('T')[0] : '',
      });
    }
    if (error) {
      setError('Intervention introuvable');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .update({
          scheduled_date: interventionData.scheduled_date,
          status: interventionData.status,
          description: interventionData.description || null,
          labor_hours: interventionData.labor_hours || null,
          labor_rate: interventionData.labor_rate || null,
          travel_fee: interventionData.travel_fee || 0,
        })
        .eq('id', params.id);

      if (error) throw error;

      router.push(`/dashboard/interventions/${params.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Annuler
      </button>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        ✏️ Modifier l'intervention
      </h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Date d'intervention *
          </label>
          <input
            type="date"
            required
            value={interventionData.scheduled_date}
            onChange={(e) => setInterventionData({ ...interventionData, scheduled_date: e.target.value })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Statut */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Statut
          </label>
          <select
            value={interventionData.status}
            onChange={(e) => setInterventionData({ ...interventionData, status: e.target.value })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="scheduled">📅 Planifiée</option>
            <option value="in_progress">⏳ En cours</option>
            <option value="completed">✅ Terminée</option>
            <option value="cancelled">❌ Annulée</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={interventionData.description || ''}
            onChange={(e) => setInterventionData({ ...interventionData, description: e.target.value })}
            rows={6}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="Détails de l'intervention..."
          />
        </div>

        {/* Durée et taux horaire */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Durée (heures)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={interventionData.labor_hours || ''}
              onChange={(e) => setInterventionData({ ...interventionData, labor_hours: parseFloat(e.target.value) || null })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="2.5"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Taux horaire (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={interventionData.labor_rate || ''}
              onChange={(e) => setInterventionData({ ...interventionData, labor_rate: parseFloat(e.target.value) || null })}
              className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="50.00"
            />
          </div>
        </div>

        {/* Frais de déplacement */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Frais de déplacement (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={interventionData.travel_fee || ''}
            onChange={(e) => setInterventionData({ ...interventionData, travel_fee: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-4 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            placeholder="30.00"
          />
        </div>

        {/* Bouton */}
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:from-green-700 hover:to-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
