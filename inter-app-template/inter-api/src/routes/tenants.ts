import { Hono } from 'hono'
import { getAuth } from '../middleware/auth.js'
import { requireFeature } from '../middleware/feature-flags.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { z } from 'zod'

const tenants = new Hono()

/**
 * GET /api/tenants/me
 * Get current tenant information
 */
tenants.get('/me', async (c) => {
  try {
    const { tenant } = getAuth(c)
    return c.json(tenant)
  } catch (error) {
    console.error('Get tenant error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * PATCH /api/tenants/me
 * Update tenant settings
 */
tenants.patch('/me', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const body = await c.req.json()

    const updateSchema = z.object({
      name: z.string().min(2).optional(),
      logo_url: z.string().url().nullable().optional(),
      primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
      secondary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
      custom_domain: z.string().nullable().optional()
    })

    const validated = updateSchema.parse(body)

    // Check if white_label feature is required for branding changes
    if (validated.logo_url !== undefined ||
        validated.primary_color !== undefined ||
        validated.secondary_color !== undefined ||
        validated.custom_domain !== undefined) {

      // Check if tenant has white_label feature (Starter+)
      const { tenant: currentTenant } = getAuth(c)
      const planFeatures = await import('../types/index.js').then(m => m.PLAN_FEATURES)
      const features = planFeatures[currentTenant.subscription_plan].features

      if (!features.includes('white_label') && !features.includes('*')) {
        return c.json({
          error: 'Feature Not Available',
          message: 'La personnalisation de marque nécessite un plan Starter ou supérieur'
        }, 403)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .update(validated)
      .eq('id', tenant.id)
      .select()
      .single()

    if (error) {
      console.error('Update tenant error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la mise à jour des paramètres'
      }, 500)
    }

    return c.json(data)
  } catch (error: any) {
    console.error('Update tenant error:', error)
    if (error.name === 'ZodError') {
      return c.json({
        error: 'Validation Error',
        message: 'Données invalides',
        details: error.errors
      }, 400)
    }
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * GET /api/tenants/me/users
 * List all users in tenant
 */
tenants.get('/me/users', async (c) => {
  try {
    const { tenant } = getAuth(c)

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, avatar_url, is_active, last_login_at, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('List users error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la récupération des utilisateurs'
      }, 500)
    }

    return c.json({ data: data || [] })
  } catch (error) {
    console.error('List users error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * GET /api/tenants/me/subscription
 * Get subscription details and usage
 */
tenants.get('/me/subscription', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const planFeatures = await import('../types/index.js').then(m => m.PLAN_FEATURES)
    const currentPlan = planFeatures[tenant.subscription_plan]

    // Calculate usage
    const { count: interventionsCount } = await supabaseAdmin
      .from('interventions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const { count: clientsCount } = await supabaseAdmin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const { count: devisCount } = await supabaseAdmin
      .from('devis')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const { count: facturesCount } = await supabaseAdmin
      .from('factures')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    return c.json({
      plan: {
        name: currentPlan.name,
        price: currentPlan.price,
        features: currentPlan.features,
        max_users: currentPlan.maxUsers
      },
      subscription: {
        status: tenant.subscription_status,
        trial_ends_at: tenant.trial_ends_at,
        subscription_ends_at: tenant.subscription_ends_at
      },
      usage: {
        users: {
          current: tenant.current_users_count,
          limit: currentPlan.maxUsers
        },
        interventions: {
          current: interventionsCount || 0,
          limit: currentPlan.limits.interventions
        },
        clients: {
          current: clientsCount || 0,
          limit: currentPlan.limits.clients
        },
        devis: {
          current: devisCount || 0,
          limit: currentPlan.limits.devis
        },
        factures: {
          current: facturesCount || 0,
          limit: currentPlan.limits.factures
        }
      }
    })
  } catch (error) {
    console.error('Get subscription error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * GET /api/tenants/me/stats
 * Get dashboard statistics
 */
tenants.get('/me/stats', async (c) => {
  try {
    const { tenant } = getAuth(c)

    // Interventions stats
    const { count: totalInterventions } = await supabaseAdmin
      .from('interventions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    const { count: pendingInterventions } = await supabaseAdmin
      .from('interventions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')

    const { count: completedInterventions } = await supabaseAdmin
      .from('interventions')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('status', 'completed')

    // Clients stats
    const { count: totalClients } = await supabaseAdmin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)

    // Factures stats (if available)
    let facturesStats = null
    const planFeatures = await import('../types/index.js').then(m => m.PLAN_FEATURES)
    const features = planFeatures[tenant.subscription_plan].features

    if (features.includes('factures') || features.includes('*')) {
      const { data: unpaidFactures } = await supabaseAdmin
        .from('factures')
        .select('amount_due')
        .eq('tenant_id', tenant.id)
        .in('status', ['sent', 'overdue', 'partially_paid'])

      const totalUnpaid = unpaidFactures?.reduce((sum, f) => sum + f.amount_due, 0) || 0

      const { count: overdueCount } = await supabaseAdmin
        .from('factures')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('status', 'overdue')

      facturesStats = {
        total_unpaid: totalUnpaid,
        overdue_count: overdueCount || 0
      }
    }

    return c.json({
      interventions: {
        total: totalInterventions || 0,
        pending: pendingInterventions || 0,
        completed: completedInterventions || 0
      },
      clients: {
        total: totalClients || 0
      },
      factures: facturesStats
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

export default tenants
