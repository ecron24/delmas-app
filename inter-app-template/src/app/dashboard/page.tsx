'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      apiClient.setToken(token)
      loadStats()
    }
  }, [])

  const loadStats = async () => {
    try {
      const data = await apiClient.getStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Interventions</CardTitle>
            <CardDescription>Total des interventions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.interventions?.total || 0}</div>
            <p className="text-sm text-muted-foreground">
              {stats?.interventions?.pending || 0} en attente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Total des clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.clients?.total || 0}</div>
          </CardContent>
        </Card>

        {stats?.factures && (
          <Card>
            <CardHeader>
              <CardTitle>Factures impayées</CardTitle>
              <CardDescription>Montant total</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.factures.total_unpaid.toFixed(2)} €</div>
              <p className="text-sm text-destructive">
                {stats.factures.overdue_count} en retard
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
