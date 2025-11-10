import { Context, Next } from 'hono'
import { supabaseAdmin } from '../lib/supabase.js'
import { AuthContext, Tenant, User } from '../types/index.js'

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext
  }
}

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: 'Token manquant' }, 401)
  }

  const token = authHeader.substring(7)

  try {
    // Verify token with Supabase
    const { data: { user: supabaseUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !supabaseUser) {
      return c.json({ error: 'Unauthorized', message: 'Token invalide' }, 401)
    }

    // Get user from database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', supabaseUser.id)
      .single()

    if (userError || !user) {
      return c.json({ error: 'Unauthorized', message: 'Utilisateur non trouvé' }, 401)
    }

    // Check if user is active
    if (!user.is_active) {
      return c.json({ error: 'Forbidden', message: 'Compte désactivé' }, 403)
    }

    // Get tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', user.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return c.json({ error: 'Unauthorized', message: 'Organisation non trouvée' }, 401)
    }

    // Check subscription status
    if (tenant.subscription_status !== 'active' && tenant.subscription_status !== 'trial') {
      return c.json({
        error: 'Subscription Inactive',
        message: 'Votre abonnement est inactif. Veuillez renouveler votre abonnement.'
      }, 402) // 402 Payment Required
    }

    // Store auth context
    c.set('auth', {
      user: user as User,
      tenant: tenant as Tenant
    })

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({ error: 'Unauthorized', message: 'Erreur d\'authentification' }, 401)
  }
}

// Helper to get auth context
export const getAuth = (c: Context): AuthContext => {
  const auth = c.get('auth')
  if (!auth) {
    throw new Error('Auth context not found')
  }
  return auth
}
