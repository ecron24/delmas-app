'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { InterventionCardLazy } from '@/app/components/lazy';
import { Calendar, TrendingUp, Clock } from 'lucide-react';
import { Suspense } from 'react';
import { CardSkeleton } from '@/app/components/ui/Skeletons';

type Intervention = {
  id: string;
  reference: string;
  status: string;
  scheduled_date: string;
  payment_status: string | null;
  description: string;
  client: {
    id: string;
    first_name: string;
    last_name: string;
    company_name: string | null;
    type: string;
  } | null;
  total_ttc: number;
  labor_hours: number | null;
  labor_rate: number | null;
  travel_fee: number;
  intervention_types_junction: Array<{ intervention_type: string }>;
  synced_to_gcal?: boolean;
  created_from?: 'app' | 'gcal';
  on_hold_at?: string | null;
  on_hold_reason?: string | null;
};

export default function InterventionsPage() {
  const router = useRouter();
  const [todayInterventions, setTodayInterventions] = useState<Intervention[]>([]);
  const [tomorrowInterventions, setTomorrowInterventions] = useState<Intervention[]>([]);
  const [upcomingInterventions, setUpcomingInterventions] = useState<Intervention[]>([]);
  const [inProgressInterventions, setInProgressInterventions] = useState<Intervention[]>([]);
  const [onHoldInterventions, setOnHoldInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'planning' | 'inprogress' | 'onhold'>('planning');

  const [stats, setStats] = useState({
    todayCount: 0,
    weekCount: 0,
    weekRevenue: 0,
    inProgressCount: 0,
    onHoldCount: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
  });

  useEffect(() => {
    loadInterventions();
  }, []);

  const loadInterventions = async () => {
    const supabase = createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data, error } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        *,
        client:clients(id, first_name, last_name, company_name, type),
        intervention_types_junction(intervention_type)
      `)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Erreur:', error);
      setLoading(false);
      return;
    }

    const interventionsData = data || [];

    const todayList = interventionsData.filter(i => {
      const interventionDate = i.scheduled_date?.split('T')[0]; // Extraire juste YYYY-MM-DD
      return interventionDate === todayStr &&
             ['scheduled', 'in_progress'].includes(i.status);
    });

    const tomorrowList = interventionsData.filter(i => {
      const interventionDate = i.scheduled_date?.split('T')[0];
      return interventionDate === tomorrowStr &&
             i.status === 'scheduled';
    });

    const upcomingList = interventionsData.filter(i => {
      const date = new Date(i.scheduled_date);
      return date > tomorrow &&
             date <= nextWeek &&
             i.status === 'scheduled';
    }).slice(0, 10);

    const inProgressList = interventionsData.filter(i =>
      i.status === 'in_progress' && !i.on_hold_at  // En cours mais PAS en attente
    );

    const onHoldList = interventionsData.filter(i =>
      i.on_hold_at !== null && i.on_hold_at !== undefined  // En attente
    );

    setTodayInterventions(todayList);
    setTomorrowInterventions(tomorrowList);
    setUpcomingInterventions(upcomingList);
    setInProgressInterventions(inProgressList);
    setOnHoldInterventions(onHoldList);

    const weekInterventions = interventionsData.filter(i => {
      const date = new Date(i.scheduled_date);
      return date >= startOfWeek && date <= endOfWeek;
    });

    const weekRevenue = weekInterventions
      .filter(i => i.status === 'completed' || i.status === 'invoiced')
      .reduce((sum, i) => sum + (i.total_ttc || 0), 0);

    setStats({
      todayCount: todayList.length,
      weekCount: weekInterventions.length,
      weekRevenue,
      inProgressCount: inProgressList.length,
      onHoldCount: onHoldList.length,
      unpaidCount: 0,
      unpaidAmount: 0,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* HEADER - MOBILE OPTIMISÉ */}
      <div className="space-y-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📋 Interventions</h1>

        <button
          onClick={() => router.push('/dashboard/interventions/new')}
          className="w-full sm:w-auto px-6 py-4 bg-secondary text-white rounded-xl font-bold hover:bg-secondary-dark transition-all shadow-lg flex items-center justify-center gap-2 text-lg"
        >
          ➕ Nouvelle intervention
        </button>
      </div>

      {/* STATS CARDS - GRILLE 2x2 MOBILE */}
      <div className="grid grid-cols-2 gap-3">
        {/* Aujourd'hui */}
        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <Calendar className="w-8 h-8 text-primary mb-2" />
            <span className={`text-3xl font-bold text-primary mb-1 ${stats.todayCount > 0 ? 'animate-pulse' : ''}`}>
              {stats.todayCount}
            </span>
            <p className="text-xs font-semibold text-gray-900">Aujourd'hui</p>
          </div>
        </div>

        {/* Cette semaine */}
        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <TrendingUp className="w-8 h-8 text-primary mb-2" />
            <span className="text-3xl font-bold text-primary mb-1">{stats.weekCount}</span>
            <p className="text-xs font-semibold text-gray-900">Cette semaine</p>
          </div>
        </div>

        {/* En cours */}
        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <Clock className="w-8 h-8 text-primary mb-2" />
            <span className={`text-3xl font-bold text-primary mb-1 ${stats.inProgressCount > 0 ? 'animate-pulse' : ''}`}>
              {stats.inProgressCount}
            </span>
            <p className="text-xs font-semibold text-gray-900">En cours</p>
          </div>
        </div>

        {/* En attente */}
        <div className="bg-white rounded-lg p-4 border-2 border-orange-500 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl mb-2">⏸️</span>
            <span className={`text-3xl font-bold text-orange-600 mb-1 ${stats.onHoldCount > 0 ? 'animate-pulse' : ''}`}>
              {stats.onHoldCount}
            </span>
            <p className="text-xs font-semibold text-gray-900">En attente</p>
          </div>
        </div>
      </div>

      {/* ONGLETS - VERSION MOBILE */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="border-b-2 border-gray-200 flex">
          <button
            onClick={() => setActiveTab('planning')}
            className={`flex-1 py-3 px-2 text-sm font-bold transition-colors relative ${
              activeTab === 'planning'
                ? 'bg-blue-50 text-secondary'
                : 'text-gray-600'
            }`}
          >
            <span className="flex flex-col items-center gap-1">
              <span>📅</span>
              <span className="hidden sm:inline">Planning</span>
              {(todayInterventions.length + tomorrowInterventions.length + upcomingInterventions.length) > 0 && (
                <span className="bg-secondary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {todayInterventions.length + tomorrowInterventions.length + upcomingInterventions.length}
                </span>
              )}
            </span>
            {activeTab === 'planning' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inprogress')}
            className={`flex-1 py-3 px-2 text-sm font-bold transition-colors relative ${
              activeTab === 'inprogress'
                ? 'bg-green-50 text-green-600'
                : 'text-gray-600'
            }`}
          >
            <span className="flex flex-col items-center gap-1">
              <span>⏳</span>
              <span className="hidden sm:inline">En cours</span>
              {stats.inProgressCount > 0 && (
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {stats.inProgressCount}
                </span>
              )}
            </span>
            {activeTab === 'inprogress' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-600"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('onhold')}
            className={`flex-1 py-3 px-2 text-sm font-bold transition-colors relative ${
              activeTab === 'onhold'
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-600'
            }`}
          >
            <span className="flex flex-col items-center gap-1">
              <span>⏸️</span>
              <span className="hidden sm:inline">En attente</span>
              {stats.onHoldCount > 0 && (
                <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {stats.onHoldCount}
                </span>
              )}
            </span>
            {activeTab === 'onhold' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600"></div>
            )}
          </button>
        </div>

        {/* CONTENU - MOBILE FRIENDLY */}
        <div className="p-3 sm:p-6">
          {activeTab === 'planning' && (
            <div className="space-y-4">
              {/* AUJOURD'HUI */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900">🔥 Aujourd'hui</h2>
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                    {todayInterventions.length}
                  </span>
                </div>

                {todayInterventions.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p className="text-3xl mb-2">✅</p>
                    <p className="text-sm text-gray-600">Aucune intervention aujourd'hui</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayInterventions.map((intervention) => (
                      <Suspense key={intervention.id} fallback={<CardSkeleton />}>
                        <InterventionCardLazy intervention={intervention} />
                      </Suspense>
                    ))}
                  </div>
                )}
              </div>

              {/* DEMAIN */}
              {tomorrowInterventions.length > 0 && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">⏭️ Demain</h2>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                      {tomorrowInterventions.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {tomorrowInterventions.map((intervention) => (
                      <Suspense key={intervention.id} fallback={<CardSkeleton />}>
                        <InterventionCardLazy intervention={intervention} />
                      </Suspense>
                    ))}
                  </div>
                </div>
              )}

              {/* PROCHAINES */}
              {upcomingInterventions.length > 0 && (
                <div className="pt-4 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base sm:text-lg font-bold text-gray-900">📆 Prochainement</h2>
                    <button
                      onClick={() => router.push('/dashboard/calendar')}
                      className="text-xs sm:text-sm text-secondary font-semibold"
                    >
                      Calendrier →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {upcomingInterventions.map((intervention) => (
                      <Suspense key={intervention.id} fallback={<CardSkeleton />}>
                        <InterventionCardLazy intervention={intervention} />
                      </Suspense>
                    ))}
                  </div>
                </div>
              )}

              {todayInterventions.length === 0 &&
               tomorrowInterventions.length === 0 &&
               upcomingInterventions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">📭</p>
                  <p className="text-lg font-bold text-gray-900 mb-2">Aucune intervention</p>
                  <p className="text-sm text-gray-500 mb-4">Créez votre première intervention</p>
                  <button
                    onClick={() => router.push('/dashboard/interventions/new')}
                    className="px-6 py-3 bg-secondary text-white rounded-xl font-bold hover:bg-secondary-dark transition-colors shadow-lg"
                  >
                    ➕ Nouvelle intervention
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inprogress' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">⏳ En cours</h2>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                  {inProgressInterventions.length}
                </span>
              </div>

              {inProgressInterventions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-sm text-gray-600">Aucune intervention en cours</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inProgressInterventions.map((intervention) => (
                  <Suspense key={intervention.id} fallback={<CardSkeleton />}>
                    <InterventionCardLazy intervention={intervention} />
                  </Suspense>
                ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'onhold' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">⏸️ En attente</h2>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                  {onHoldInterventions.length}
                </span>
              </div>

              {onHoldInterventions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-sm text-gray-600">Aucune intervention en attente</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {onHoldInterventions.map((intervention) => (
                    <Suspense key={intervention.id} fallback={<CardSkeleton />}>
                      <InterventionCardLazy intervention={intervention} />
                    </Suspense>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
