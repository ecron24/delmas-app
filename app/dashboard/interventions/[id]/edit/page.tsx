'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { InterventionFormLazy } from '@/app/components/lazy';
import { FormSkeleton } from '@/app/components/ui/Skeletons';

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  mobile: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  notes: string | null;
  type: string;
  company_name: string | null;
};

type Intervention = {
  id: string;
  client_id: string;
  technician_id: string | null;
  scheduled_date: string;
  status: string;
  description: string;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  created_from: string | null;
  intervention_types_junction: Array<{ intervention_type: string }>;
};

export default function EditInterventionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [isGcalImport, setIsGcalImport] = useState(false);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const supabase = createClient();

      // 🔍 Charger l'intervention avec toutes les données
      const { data: interventionData, error: interventionError } = await supabase
        .schema('piscine_delmas_public')
        .from('interventions')
        .select(`
          *,
          clients (*),
          intervention_types_junction (intervention_type)
        `)
        .eq('id', params.id)
        .single();

      if (interventionError) {
        throw new Error('Intervention introuvable');
      }

      if (interventionData) {
        setIntervention(interventionData);
        setClient(interventionData.clients);
        setIsGcalImport(interventionData.created_from === 'gcal');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">❌ Erreur</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isGcalImport ? '📅 Compléter l\'intervention' : '✏️ Modifier l\'intervention'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isGcalImport && (
              <span className="text-blue-600 font-medium">
                ⚡ Importée depuis Google Calendar - Complétez toutes les informations
              </span>
            )}
            {!isGcalImport && client && (
              <span>Client: {client.first_name} {client.last_name}</span>
            )}
          </p>
        </div>
      </div>

      {/* 🚨 Badge d'alerte pour les imports Google Calendar */}
      {isGcalImport && (
        <div className="bg-gradient-to-r from-blue-50 to-orange-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-bold text-blue-900">Intervention importée depuis Google Calendar</p>
              <p className="text-sm text-blue-700">
                Complétez les informations client, ajoutez la piscine, les types d'intervention et tous les détails nécessaires.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire complet avec lazy loading */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Suspense fallback={<FormSkeleton />}>
          <InterventionFormLazy
            existingClient={client}
            existingIntervention={intervention}
            mode="edit"
          />
        </Suspense>
      </div>
    </div>
  );
}
