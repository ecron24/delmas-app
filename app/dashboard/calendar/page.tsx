'use client';

import { useState, useEffect } from 'react';
import { fromDelmas, createClient } from '@/lib/supabase/client'; // ✅ Importer les deux
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

type Intervention = {
  id: string;
  reference: string;
  scheduled_date: string;
  status: string;
  gcal_event_id: string | null;
  created_from?: 'app' | 'gcal';
  client: {
    first_name: string;
    last_name: string;
    company_name: string | null;
    type: string;
  } | null;
  intervention_types_junction: Array<{ intervention_type: string }>;
  description: string;
};

export default function CalendarPage() {
  const router = useRouter();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month'); // Vue par défaut: mois

  useEffect(() => {
    loadInterventions();

    // 🔄 Synchro temps réel - CORRIGÉ
    const supabase = createClient(); // ✅ Créer une instance du client

    const subscription = supabase
      .channel('interventions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'piscine_delmas_public', // ✅ Votre schéma
          table: 'interventions'
        },
        (payload) => {
          console.log('🔄 Changement détecté:', payload);

          if (payload.eventType === 'INSERT') {
            setSyncMessage('✅ Nouvelle intervention synchronisée');
          } else if (payload.eventType === 'UPDATE') {
            setSyncMessage('🔄 Intervention mise à jour');
          } else if (payload.eventType === 'DELETE') {
            setSyncMessage('🗑️ Intervention supprimée');
          }

          loadInterventions();

          setTimeout(() => setSyncMessage(null), 3000);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentDate]);

  const loadInterventions = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const formatDate = (y: number, m: number, d: number) => {
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };

    const startOfMonth = formatDate(year, month, 1);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endOfMonth = formatDate(year, month, lastDay);

    const { data, error } = await fromDelmas('interventions')
      .select(`
        *,
        client:clients(first_name, last_name, company_name, type),
        intervention_types_junction(intervention_type)
      `)
      .gte('scheduled_date', startOfMonth)
      .lte('scheduled_date', endOfMonth)
      .order('scheduled_date');

    console.log('✅ Interventions chargées:', data?.length || 0);
    if (data && data.length > 0) {
      console.log('📅 Exemple:', data[0].scheduled_date);
    }

    setInterventions(data || []);
    setLoading(false);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getInterventionsForDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const result = interventions.filter(i => {
      const interventionDate = i.scheduled_date.split(' ')[0].split('T')[0];
      return interventionDate === dateStr;
    });

    return result;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const previousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const getWeekDays = () => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay(); // Premier jour de la semaine (Dimanche)

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr.setDate(first + i));
      weekDays.push(day);
    }
    return weekDays;
  };

  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const weekDays = getWeekDays();
  const weekRange = viewMode === 'week'
    ? `${weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : '';
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const days = getDaysInMonth();

  const selectedInterventions = selectedDate
    ? interventions.filter(i => {
        const interventionDate = i.scheduled_date.split(' ')[0].split('T')[0];
        return interventionDate === selectedDate;
      })
    : [];

  const stats = {
    total: interventions.length,
    fromApp: interventions.filter(i => i.created_from === 'app' || !i.created_from).length,
    fromGcal: interventions.filter(i => i.created_from === 'gcal').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {syncMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-xl shadow-lg z-50 animate-bounce">
          {syncMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">📅 Calendrier</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => router.push('/dashboard/interventions/new')}
            className="flex-1 sm:flex-none px-3 py-2 md:px-4 md:py-2 bg-secondary text-white rounded-xl font-bold hover:bg-secondary-dark transition-all shadow-lg text-sm"
          >
            ➕ <span className="hidden sm:inline">Intervention</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Interventions du mois</p>
            <p className="text-xs text-gray-500">Vue calendrier complète</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Créées ici</p>
            <p className="text-2xl font-bold text-green-600">{stats.fromApp}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Depuis Google</p>
            <p className="text-2xl font-bold text-purple-600">{stats.fromGcal}</p>
          </div>
        </div>

        {stats.fromGcal > 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">
                  {stats.fromGcal} intervention{stats.fromGcal > 1 ? 's importées' : ' importée'} depuis Google Calendar
                </p>
                <p className="text-xs text-blue-700">
                  Les événements créés dans Google Calendar sont automatiquement importés dans l'application.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-3 md:p-4 border-b-2 border-gray-200 bg-primary">
          <button
            onClick={viewMode === 'month' ? previousMonth : previousWeek}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <div className="flex flex-col items-center gap-2">
            <h2 className="text-base md:text-xl font-bold text-white capitalize">
              {viewMode === 'month' ? monthName : weekRange}
            </h2>

            {/* Toggle Mois / Semaine */}
            <div className="flex bg-white/20 rounded-lg p-1 gap-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  viewMode === 'month'
                    ? 'bg-white text-primary'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white text-primary'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Semaine
              </button>
            </div>
          </div>

          <button
            onClick={viewMode === 'month' ? nextMonth : nextWeek}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b-2 border-gray-200 bg-gray-50">
          {dayNames.map((day) => (
            <div key={day} className="text-center py-2 text-xs font-bold text-gray-600">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 overflow-x-auto">
          {viewMode === 'month' ? (
            // Vue mensuelle
            days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="min-h-24 border border-gray-100 bg-gray-50"></div>;
              }

              const dayInterventions = getInterventionsForDay(day);
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-24 border border-gray-100 p-1.5 transition-colors relative text-left w-full ${
                    isToday(day) ? 'bg-blue-50 border-secondary' : 'hover:bg-gray-50'
                  } ${selectedDate === dateStr ? 'ring-2 ring-secondary ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-bold ${
                      isToday(day) ? 'text-secondary' : 'text-gray-900'
                    }`}>
                      {day}
                    </span>
                    {isToday(day) && (
                      <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayInterventions.slice(0, 3).map((intervention) => {
                      const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
                        ? intervention.client.company_name
                        : intervention.client?.last_name || 'Client';

                      const fromGcal = intervention.created_from === 'gcal';

                      return (
                        <div
                          key={intervention.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/interventions/${intervention.id}`);
                          }}
                          className={`w-full text-left text-xs p-1.5 rounded border-l-2 transition-all hover:shadow-md cursor-pointer ${
                            fromGcal
                              ? 'bg-purple-50 border-purple-500 hover:bg-purple-100'
                              : 'bg-green-50 border-green-500 hover:bg-green-100'
                          }`}
                        >
                          <div className="font-semibold text-gray-900 truncate">
                            {clientName}
                          </div>
                          {intervention.intervention_types_junction?.[0]?.intervention_type && (
                            <div className="text-[10px] text-gray-600 truncate mt-0.5">
                              {intervention.intervention_types_junction[0].intervention_type}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {dayInterventions.length > 3 && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full text-center text-xs py-1 text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        + {dayInterventions.length - 3} autre{dayInterventions.length - 3 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          ) : (
            // Vue hebdomadaire - Plus grande et plus lisible
            weekDays.map((date) => {
              const day = date.getDate();
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

              const dayInterventions = interventions.filter(i => {
                const interventionDate = i.scheduled_date.split(' ')[0].split('T')[0];
                return interventionDate === dateStr;
              });

              const today = new Date();
              const isTodayDate = date.toDateString() === today.toDateString();

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-40 md:min-h-48 border border-gray-100 p-2 md:p-3 transition-colors relative text-left w-full ${
                    isTodayDate ? 'bg-blue-50 border-secondary' : 'hover:bg-gray-50'
                  } ${selectedDate === dateStr ? 'ring-2 ring-secondary ring-inset' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-base md:text-lg font-bold ${
                      isTodayDate ? 'text-secondary' : 'text-gray-900'
                    }`}>
                      {day}
                    </span>
                    {isTodayDate && (
                      <div className="w-2 h-2 bg-secondary rounded-full"></div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dayInterventions.map((intervention) => {
                      const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
                        ? intervention.client.company_name
                        : intervention.client?.last_name || 'Client';

                      const fromGcal = intervention.created_from === 'gcal';

                      return (
                        <div
                          key={intervention.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/interventions/${intervention.id}`);
                          }}
                          className={`w-full text-left text-sm p-2 rounded border-l-2 transition-all hover:shadow-md cursor-pointer ${
                            fromGcal
                              ? 'bg-purple-50 border-purple-500 hover:bg-purple-100'
                              : 'bg-green-50 border-green-500 hover:bg-green-100'
                          }`}
                        >
                          <div className="font-semibold text-gray-900">
                            {clientName}
                          </div>
                          {intervention.intervention_types_junction?.[0]?.intervention_type && (
                            <div className="text-xs text-gray-600 mt-1">
                              {intervention.intervention_types_junction[0].intervention_type}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {dayInterventions.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-2">
                        Aucune intervention
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-bold text-gray-900">
              📋 {(() => {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                });
              })()}
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-sm text-gray-500 hover:text-gray-700 p-2"
            >
              ✕
            </button>
          </div>

          {selectedInterventions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Aucune intervention</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedInterventions.map((intervention) => {
                const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
                  ? intervention.client.company_name
                  : intervention.client?.last_name || 'Client non défini';

                return (
                  <div
                    key={intervention.id}
                    onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
                    className="border-2 border-gray-200 rounded-xl p-3 md:p-4 hover:border-secondary transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-gray-900 text-sm md:text-base flex-1">
                        {clientName}
                      </h4>
                      {intervention.created_from === 'gcal' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-semibold">
                          📥 Google Calendar
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 md:gap-2 mb-2">
                      {intervention.intervention_types_junction?.map((t: any, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          {t.intervention_type}
                        </span>
                      ))}
                    </div>
                    {intervention.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{intervention.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
