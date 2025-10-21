'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Intervention = {
  id: string;
  reference: string;
  scheduled_date: string;
  status: string;
  gcal_event_id: string | null;
  gcal_last_sync: string | null;
  synced_to_gcal: boolean;
  client: {
    first_name: string;
    last_name: string;
    company_name: string | null;
    type: string;
  };
  intervention_types_junction: Array<{ intervention_type: string }>;
};

type CalendarSettings = {
  connected: boolean;
  calendar_id: string;
  sync_enabled: boolean;
  last_sync: string | null;
};

export default function CalendarPage() {
  const router = useRouter();
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadInterventions();
    loadCalendarSettings();
  }, [currentDate]);

  const loadCalendarSettings = async () => {
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .schema('piscine_delmas_public')
        .rpc('get_google_calendar_settings');

      if (error) {
        console.error('Erreur lors du chargement des settings:', error);
        return;
      }

      if (data && data.length > 0) {
        setCalendarSettings(data[0]);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadInterventions = async () => {
    const supabase = createClient();

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const { data } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        *,
        client:clients(first_name, last_name, company_name, type),
        intervention_types_junction(intervention_type)
      `)
      .gte('scheduled_date', startOfMonth.toISOString().split('T')[0])
      .lte('scheduled_date', endOfMonth.toISOString().split('T')[0])
      .order('scheduled_date');

    setInterventions(data || []);
    setLoading(false);
  };

  const enableGoogleCalendar = async () => {
    const supabase = createClient();

    try {
      const { error } = await supabase
        .schema('piscine_delmas_public')
        .from('settings')
        .update({
          value: {
            connected: true,
            calendar_id: 'stephanedelmas69@gmail.com',
            sync_enabled: true,
            last_sync: new Date().toISOString()
          }
        })
        .eq('key', 'google_calendar');

      if (error) {
        console.error('Erreur lors de l\'activation:', error);
        alert('❌ Erreur lors de l\'activation. Vérifiez la console.');
        return;
      }

      await loadCalendarSettings();
      alert('✅ Google Calendar activé ! Les interventions seront synchronisées automatiquement.');
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Une erreur est survenue.');
    }
  };

  const forceSyncToGoogleCalendar = async () => {
    setSyncing(true);

    try {
      const response = await fetch('https://n8n.oppsys.io/webhook/bc21a81a-6fdc-4fd7-926f-5d7c42c908c5', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'force_sync',
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Résultat de la sync:', result);
        alert('✅ Synchronisation lancée ! Vérifiez Google Calendar dans quelques secondes.');
        await loadInterventions();
        await loadCalendarSettings();
      } else {
        const error = await response.text();
        console.error('❌ Erreur de la réponse:', error);
        throw new Error(`Erreur ${response.status}: ${error}`);
      }
    } catch (error) {
      console.error('❌ Erreur de synchronisation:', error);
      alert('❌ Erreur lors de la synchronisation. Vérifiez la console et la configuration n8n.');
    } finally {
      setSyncing(false);
    }
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
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString().split('T')[0];
    return interventions.filter(i => i.scheduled_date === dateStr);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

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
        <h1 className="text-2xl font-bold text-gray-900">📅 Calendrier</h1>
        <div className="flex gap-3">
          {/* Statut Google Calendar */}
          {calendarSettings?.connected ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border-2 border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-green-700">Google Calendar connecté</span>
            </div>
          ) : (
            <button
              onClick={enableGoogleCalendar}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              🔗 Connecter Google Calendar
            </button>
          )}

          <button
            onClick={() => router.push('/dashboard/interventions/new')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            ➕ Nouvelle intervention
          </button>
        </div>
      </div>

      {/* Barre de synchronisation */}
      {calendarSettings?.connected && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">Synchronisation automatique activée</p>
              <p className="text-sm text-blue-700">
                Les interventions sont synchronisées avec Google Calendar en temps réel
              </p>
              {calendarSettings.last_sync && (
                <p className="text-xs text-blue-600 mt-1">
                  Dernière sync: {new Date(calendarSettings.last_sync).toLocaleString('fr-FR')}
                </p>
              )}
            </div>
            <button
              onClick={forceSyncToGoogleCalendar}
              disabled={syncing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? (
                <span className="flex items-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Synchronisation...
                </span>
              ) : (
                '🔄 Forcer la synchronisation'
              )}
            </button>
          </div>

          {/* Statistiques de sync */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-gray-600">Interventions totales</p>
              <p className="text-2xl font-bold text-blue-900">{interventions.length}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-gray-600">Synchronisées</p>
              <p className="text-2xl font-bold text-green-600">
                {interventions.filter(i => i.synced_to_gcal).length}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-orange-600">
                {interventions.filter(i => !i.synced_to_gcal).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation mois */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2 className="text-xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>

          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Grille calendrier */}
        <div className="grid grid-cols-7 gap-2">
          {/* Jours de la semaine */}
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
              {day}
            </div>
          ))}

          {/* Jours du mois */}
          {getDaysInMonth().map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayInterventions = getInterventionsForDay(day);
            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

            return (
              <div
                key={day}
                className={`aspect-square border-2 rounded-lg p-1 ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="text-xs font-semibold text-gray-700 mb-1">{day}</div>
                <div className="space-y-1">
                  {dayInterventions.slice(0, 2).map(intervention => {
                    const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
                      ? intervention.client.company_name
                      : `${intervention.client?.first_name || ''} ${intervention.client?.last_name || ''}`.trim();

                    return (
                      <button
                        key={intervention.id}
                        onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
                        className={`w-full text-left text-xs px-1 py-0.5 rounded truncate transition-colors ${
                          intervention.synced_to_gcal
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        }`}
                        title={intervention.synced_to_gcal ? 'Synchronisé avec Google Calendar' : 'En attente de synchronisation'}
                      >
                        {intervention.synced_to_gcal ? '✅ ' : '⏳ '}
                        {clientName}
                      </button>
                    );
                  })}
                  {dayInterventions.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayInterventions.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Liste interventions du mois */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Interventions du mois ({interventions.length})
        </h3>

        {interventions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune intervention ce mois-ci</p>
        ) : (
          <div className="space-y-2">
            {interventions.map(intervention => {
              const clientName = intervention.client?.type === 'professionnel' && intervention.client?.company_name
                ? intervention.client.company_name
                : `${intervention.client?.first_name || ''} ${intervention.client?.last_name || ''}`.trim();

              return (
                <button
                  key={intervention.id}
                  onClick={() => router.push(`/dashboard/interventions/${intervention.id}`)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                    intervention.synced_to_gcal
                      ? 'bg-gray-50 hover:bg-blue-50'
                      : 'bg-orange-50 hover:bg-orange-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xl">
                      {intervention.synced_to_gcal ? '✅' : '⏳'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{clientName}</p>
                      <p className="text-xs text-gray-500">{intervention.reference}</p>
                      {intervention.gcal_last_sync && (
                        <p className="text-xs text-blue-600 mt-1">
                          Sync: {new Date(intervention.gcal_last_sync).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    📅 {new Date(intervention.scheduled_date).toLocaleDateString('fr-FR')}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
