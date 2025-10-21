'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type MonthlyStats = {
  month: string;
  interventions: number;
  revenue: number;
  completed: number;
};

export default function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInterventions: 0,
    totalRevenue: 0,
    averageRevenue: 0,
    completionRate: 0,
    topClient: null as { name: string; count: number } | null,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const supabase = createClient();

    // Récupérer toutes les interventions
    const { data: interventions } = await supabase
      .schema('piscine_delmas_public')
      .from('interventions')
      .select(`
        *,
        client:clients(id, first_name, last_name, company_name, type)
      `);

    if (!interventions) {
      setLoading(false);
      return;
    }

    // Stats globales
    const totalInterventions = interventions.length;
    const totalRevenue = interventions.reduce((sum, i) => {
      const labor = (i.labor_hours || 0) * (i.labor_rate || 0);
      const travel = i.travel_fee || 0;
      return sum + labor + travel;
    }, 0);

    const completed = interventions.filter(i => i.status === 'completed').length;
    const completionRate = totalInterventions > 0 ? (completed / totalInterventions) * 100 : 0;
    const averageRevenue = totalInterventions > 0 ? totalRevenue / totalInterventions : 0;

    // Top client
    const clientCounts = interventions.reduce((acc: any, i) => {
      const clientName = i.client?.type === 'professionnel' && i.client?.company_name
        ? i.client.company_name
        : `${i.client?.first_name || ''} ${i.client?.last_name || ''}`.trim();

      acc[clientName] = (acc[clientName] || 0) + 1;
      return acc;
    }, {});

    const topClientEntry = Object.entries(clientCounts).sort((a: any, b: any) => b[1] - a[1])[0];
    const topClient = topClientEntry ? { name: topClientEntry[0] as string, count: topClientEntry[1] as number } : null;

    // Stats mensuelles (6 derniers mois)
    const monthlyStats: MonthlyStats[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthInterventions = interventions.filter(int => {
        const intDate = new Date(int.scheduled_date);
        return intDate >= monthStart && intDate <= monthEnd;
      });

      const monthRevenue = monthInterventions.reduce((sum, i) => {
        const labor = (i.labor_hours || 0) * (i.labor_rate || 0);
        const travel = i.travel_fee || 0;
        return sum + labor + travel;
      }, 0);

      const monthCompleted = monthInterventions.filter(i => i.status === 'completed').length;

      monthlyStats.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        interventions: monthInterventions.length,
        revenue: monthRevenue,
        completed: monthCompleted,
      });
    }

    setStats({
      totalInterventions,
      totalRevenue,
      averageRevenue,
      completionRate,
      topClient,
    });

    setMonthlyData(monthlyStats);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">📊 Statistiques</h1>

      {/* Stats globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-semibold">Total interventions</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{stats.totalInterventions}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-semibold">CA total</p>
          <p className="text-4xl font-bold text-green-600 mt-2">{stats.totalRevenue.toFixed(0)}€</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-semibold">CA moyen</p>
          <p className="text-4xl font-bold text-purple-600 mt-2">{stats.averageRevenue.toFixed(0)}€</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 font-semibold">Taux de réalisation</p>
          <p className="text-4xl font-bold text-orange-600 mt-2">{stats.completionRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Top client */}
      {stats.topClient && (
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl shadow-lg p-6">
          <p className="text-sm opacity-90">🏆 Meilleur client</p>
          <p className="text-2xl font-bold mt-2">{stats.topClient.name}</p>
          <p className="text-sm opacity-75 mt-1">{stats.topClient.count} interventions</p>
        </div>
      )}

      {/* Graphique mensuel */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📈 Évolution des 6 derniers mois</h2>

        <div className="space-y-4">
          {monthlyData.map((month, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{month.month}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">{month.interventions} interventions</span>
                  <span className="text-sm font-bold text-green-600">{month.revenue.toFixed(0)}€</span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">Terminées: {month.completed}</span>
                <span className="text-xs text-gray-400">
                  {month.interventions > 0 ? ((month.completed / month.interventions) * 100).toFixed(0) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
