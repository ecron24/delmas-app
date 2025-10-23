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
};

type UnpaidInvoice = {
  intervention_id: string;
  invoice_number: string;
  total_ttc: number;
  invoice_date: string;
  due_date: string;
  payment_status: string;
  intervention: Intervention;
};

export default function InterventionsPage() {
  const router = useRouter();
  const [todayInterventions, setTodayInterventions] = useState<Intervention[]>([]);
  const [tomorrowInterventions, setTomorrowInterventions] = useState<Intervention[]>([]);
  const [upcomingInterventions, setUpcomingInterventions] = useState<Intervention[]>([]);
  const [inProgressInterventions, setInProgressInterventions] = useState<Intervention[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<UnpaidInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'planning' | 'inprogress' | 'unpaid'>('planning');

  const [stats, setStats] = useState({
    todayCount: 0,
    weekCount: 0,
    weekRevenue: 0,
    inProgressCount: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
  });

  useEffect(() => {
    loadInterventions();
    loadUnpaidInvoices();
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

    const todayList = interventionsData.filter(i =>
      i.scheduled_date === todayStr &&
      ['scheduled', 'in_progress'].includes(i.status)
    );

    const tomorrowList = interventionsData.filter(i =>
      i.scheduled_date === tomorrowStr &&
      i.status === 'scheduled'
    );

    const upcomingList = interventionsData.filter(i => {
      const date = new Date(i.scheduled_date);
      return date > tomorrow &&
             date <= nextWeek &&
             i.status === 'scheduled';
    }).slice(0, 10);

    const inProgressList = interventionsData.filter(i =>
      i.status === 'in_progress'
    );

    setTodayInterventions(todayList);
    setTomorrowInterventions(tomorrowList);
    setUpcomingInterventions(upcomingList);
    setInProgressInterventions(inProgressList);

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
      unpaidCount: 0,
      unpaidAmount: 0,
    });

    setLoading(false);
  };

  const loadUnpaidInvoices = async () => {
    const supabase = createClient();

    const { data: invoices, error: invoicesError } = await supabase
      .schema('piscine_delmas_compta')
      .from('invoices')
      .select('*')
      .in('status', ['sent', 'overdue'])
      .order('due_date', { ascending: true });

    if (invoicesError) {
      console.error('Erreur chargement factures:', invoicesError);
      return;
    }

    if (!invoices || invoices.length === 0) {
      setUnpaidInvoices([]);
      setStats(prev => ({ ...prev, unpaidCount: 0, unpaidAmount: 0 }));
      return;
    }

    const interventionIds = invoices.map(inv => inv.intervention_id);

    const { data: interventions, error: interventionsError } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        id,
        reference,
        scheduled_date,
        description,
        status,
        intervention_types_junction(intervention_type),
        client:clients(id, first_name, last_name, company_name, type)
      `)
      .in('id', interventionIds);

    if (interventionsError) {
      console.error('Erreur chargement interventions:', interventionsError);
      return;
    }

    const invoicesWithIntervention = invoices.map(invoice => {
      const intervention = interventions?.find(i => i.id === invoice.intervention_id);
      return {
        ...invoice,
        intervention: intervention || null,
      };
    });

    const unpaidAmount = invoicesWithIntervention.reduce((sum, invoice) => {
      return sum + invoice.total_ttc;
    }, 0);

    setUnpaidInvoices(invoicesWithIntervention as any);

    setStats(prev => ({
      ...prev,
      unpaidCount: invoicesWithIntervention.length,
      unpaidAmount,
    }));
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

        {/* CA semaine */}
        <div className="bg-white rounded-lg p-4 border-2 border-primary shadow-sm">
          <div className="flex flex-col items-center text-center">
            <span className="text-2xl mb-2">💰</span>
            <span className="text-2xl md:text-3xl font-bold text-primary mb-1">
              {stats.weekRevenue.toFixed(0)}€
            </span>
            <p className="text-xs font-semibold text-gray-900">CA semaine</p>
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
                ? 'bg-orange-50 text-orange-600'
                : 'text-gray-600'
            }`}
          >
            <span className="flex flex-col items-center gap-1">
              <span>⏳</span>
              <span className="hidden sm:inline">En cours</span>
              {stats.inProgressCount > 0 && (
                <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {stats.inProgressCount}
                </span>
              )}
            </span>
            {activeTab === 'inprogress' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('unpaid')}
            className={`flex-1 py-3 px-2 text-sm font-bold transition-colors relative ${
              activeTab === 'unpaid'
                ? 'bg-yellow-50 text-yellow-600'
                : 'text-gray-600'
            }`}
          >
            <span className="flex flex-col items-center gap-1">
              <span>💰</span>
              <span className="hidden sm:inline">Impayés</span>
              {stats.unpaidCount > 0 && (
                <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {stats.unpaidCount}
                </span>
              )}
            </span>
            {activeTab === 'unpaid' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-600"></div>
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
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
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
                    <InterventionCard key={intervention.id} intervention={intervention} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'unpaid' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">💰 Impayés</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Total : <span className="font-bold text-red-600">{stats.unpaidAmount.toFixed(2)}€</span>
                </p>
              </div>

              {unpaidInvoices.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <p className="text-3xl mb-2">✅</p>
                  <p className="text-sm text-gray-600">Tous les paiements sont à jour</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unpaidInvoices.map((invoice) => {
                    const intervention = invoice.intervention;
                    const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
                      ? intervention.client.company_name
                      : intervention.client
                        ? `${intervention.client.first_name} ${intervention.client.last_name}`
                        : 'Client non défini';

                    const remainingAmount = invoice.total_ttc;
                    const isOverdue = new Date(invoice.due_date) < new Date();

                    return (
                      <div
                        key={invoice.intervention_id}
                        className={`border-2 rounded-xl p-3 sm:p-4 ${
                          isOverdue
                            ? 'bg-red-50 border-red-300'
                            : 'bg-yellow-50 border-yellow-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
                                className="font-bold text-gray-900 hover:text-secondary text-sm sm:text-base line-clamp-1"
                              >
                                {clientName}
                              </button>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-300">
                                  {invoice.invoice_number}
                                </span>
                                {isOverdue && (
                                  <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold animate-pulse">
                                    ⚠️ RETARD
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Restant</p>
                              <p className={`text-xl sm:text-2xl font-bold ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                                {remainingAmount.toFixed(0)}€
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 space-y-1">
                            <div>📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}</div>
                            <div>📆 Échéance : {new Date(invoice.due_date).toLocaleDateString('fr-FR')}</div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/invoices/${invoice.intervention_id}/payment`);
                            }}
                            className="w-full text-sm bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
                          >
                            💳 Enregistrer paiement
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
