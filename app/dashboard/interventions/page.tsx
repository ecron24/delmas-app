'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { InterventionCard } from '@/components/interventions/InterventionCard';

type Intervention = {
  id: string;
  reference: string;
  status: string;
  scheduled_date: string;
  description: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    type: string;
  };
  total_ttc: number;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  intervention_types_junction: Array<{ intervention_type: string }>;
};

export default function InterventionsPage() {
  const router = useRouter();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [todayInterventions, setTodayInterventions] = useState<Intervention[]>([]);
  const [weekInterventions, setWeekInterventions] = useState<Intervention[]>([]);
  const [upcomingInterventions, setUpcomingInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'completed'>('all');

  // Stats
  const [stats, setStats] = useState({
    todayCount: 0,
    weekCount: 0,
    monthRevenue: 0,
    completedThisMonth: 0,
  });

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        *,
        client:clients(id, first_name, last_name, company_name, type),
        intervention_types_junction(intervention_type)
      `)
      .order('scheduled_date', { ascending: false });

    if (error) {
      console.error('Erreur:', error);
      setLoading(false);
      return;
    }

    const interventionsData = data || [];
    setInterventions(interventionsData);

    // Calculs dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Dimanche

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Filtrer interventions
    const todayList = interventionsData.filter(i => i.scheduled_date === todayStr);
    const weekList = interventionsData.filter(i => {
      const date = new Date(i.scheduled_date);
      return date >= startOfWeek && date <= endOfWeek;
    });

    const upcoming = interventionsData.filter(i => {
      const date = new Date(i.scheduled_date);
      return date > today && i.status === 'scheduled';
    }).slice(0, 5);

    setTodayInterventions(todayList);
    setWeekInterventions(weekList);
    setUpcomingInterventions(upcoming);

    // Calculer stats
    const monthInterventions = interventionsData.filter(i => {
      const date = new Date(i.scheduled_date);
      return date >= startOfMonth && date <= endOfMonth;
    });

    const monthRevenue = monthInterventions.reduce((sum, i) => {
      const labor = (i.labor_hours || 0) * (i.labor_rate || 0);
      const travel = i.travel_fee || 0;
      return sum + labor + travel;
    }, 0);

    const completedThisMonth = monthInterventions.filter(i => i.status === 'completed').length;

    setStats({
      todayCount: todayList.length,
      weekCount: weekList.length,
      monthRevenue,
      completedThisMonth,
    });

    setLoading(false);
  };

  const filteredInterventions = interventions.filter(intervention => {
    if (activeTab === 'all') return true;
    if (activeTab === 'scheduled') return intervention.status === 'scheduled';
    if (activeTab === 'completed') return intervention.status === 'completed';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">📋 Interventions</h1>
        <button
          onClick={() => router.push('/dashboard/interventions/new')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
        >
          ➕ Nouvelle
        </button>
      </div>

            {/* Stats rapides */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
          <p className="text-sm opacity-90">Aujourd'hui</p>
          <p className="text-3xl font-bold mt-1">{stats.todayCount}</p>
          <p className="text-xs opacity-75 mt-1">interventions</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
          <p className="text-sm opacity-90">Cette semaine</p>
          <p className="text-3xl font-bold mt-1">{stats.weekCount}</p>
          <p className="text-xs opacity-75 mt-1">interventions</p>
        </div>

        {/* ✅ CA du mois uniquement sur desktop */}
        <div className="hidden md:block bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
          <p className="text-sm opacity-90">CA du mois</p>
          <p className="text-3xl font-bold mt-1">{stats.monthRevenue.toFixed(0)}€</p>
          <p className="text-xs opacity-75 mt-1">chiffre d'affaires</p>
        </div>

        {/* ✅ Nouveau : Terminées du mois (visible sur mobile) */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-4 shadow-lg col-span-2 md:col-span-1">
          <p className="text-sm opacity-90">Terminées ce mois</p>
          <p className="text-3xl font-bold mt-1">{stats.completedThisMonth}</p>
          <p className="text-xs opacity-75 mt-1">interventions</p>
        </div>
      </div>

      {/* Mini calendrier - Prochaines interventions */}
      {upcomingInterventions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900">📅 Prochaines interventions</h3>
            <button
              onClick={() => router.push('/dashboard/calendar')}
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              Voir calendrier →
            </button>
          </div>

          <div className="space-y-2">
            {upcomingInterventions.map(intervention => {
              const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
                ? intervention.client.company_name
                : `${intervention.client?.first_name || ''} ${intervention.client?.last_name || ''}`.trim();

              const daysUntil = Math.ceil(
                (new Date(intervention.scheduled_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <button
                  key={intervention.id}
                  onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{clientName}</p>
                    <p className="text-xs text-gray-500">{intervention.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">
                      {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {daysUntil === 0 ? "Aujourd'hui" : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil}j`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Onglets de filtre */}
      <div className="flex gap-2 bg-white rounded-xl p-2 shadow-sm border-2 border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Toutes ({interventions.length})
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'scheduled'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Planifiées ({interventions.filter(i => i.status === 'scheduled').length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
            activeTab === 'completed'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Terminées ({interventions.filter(i => i.status === 'completed').length})
        </button>
      </div>

      {/* Liste interventions */}
      {filteredInterventions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-12 text-center">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-gray-600 font-semibold">Aucune intervention</p>
          <p className="text-sm text-gray-400 mt-2">Créez votre première intervention</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredInterventions.map((intervention) => (
            <InterventionCard key={intervention.id} intervention={intervention} />
          ))}
        </div>
      )}
    </div>
  );
}
