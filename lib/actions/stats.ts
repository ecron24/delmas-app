// lib/actions/stats.ts
import { createServerClient } from '@/lib/supabase/server';
import { cache } from 'react';

type MonthlyStats = {
  month: string;
  interventions: number;
  revenue: number;
  completed: number;
};

type Stats = {
  totalInterventions: number;
  totalRevenue: number;
  averageRevenue: number;
  completionRate: number;
  topClient: { name: string; count: number } | null;
  monthlyData: MonthlyStats[];
};

/**
 * Récupère toutes les statistiques de l'application
 * Cache automatique pendant le rendu
 */
export const getStats = cache(async (): Promise<Stats> => {
  const supabase = createServerClient();

  // Récupérer toutes les interventions
  const { data: interventions } = await supabase
    .schema('piscine_delmas_public')
    .from('interventions')
    .select(`
      *,
      client:clients(id, first_name, last_name, company_name, type)
    `);

  if (!interventions) {
    return {
      totalInterventions: 0,
      totalRevenue: 0,
      averageRevenue: 0,
      completionRate: 0,
      topClient: null,
      monthlyData: [],
    };
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

  return {
    totalInterventions,
    totalRevenue,
    averageRevenue,
    completionRate,
    topClient,
    monthlyData: monthlyStats,
  };
});
