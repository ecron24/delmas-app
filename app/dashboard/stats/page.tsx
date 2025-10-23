// ✅ SERVER COMPONENT (pas de 'use client')
import { getStats } from '@/lib/actions/stats';

export default async function StatsPage() {
  // ✅ Récupération des données côté serveur
  const stats = await getStats();
  const maxRevenue = Math.max(...stats.monthlyData.map(m => m.revenue), 1);

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
          {stats.monthlyData.map((month, index) => (
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
