import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase.js'
import { registerSchema, loginSchema } from '../lib/validation.js'
import { SubscriptionPlan, UserRole } from '../types/index.js'

const auth = new Hono()

/**
 * POST /api/auth/register
 * Register a new tenant with owner user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const validated = registerSchema.parse(body)

    // Check if tenant slug is available
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', validated.tenant_slug)
      .single()

    if (existingTenant) {
      return c.json({
        error: 'Validation Error',
        message: 'Ce slug est déjà utilisé. Veuillez en choisir un autre.'
      }, 400)
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true, // Auto-confirm for now
      user_metadata: {
        full_name: validated.full_name
      }
    })

    if (authError || !authData.user) {
      console.error('Auth creation error:', authError)
      return c.json({
        error: 'Registration Failed',
        message: authError?.message || 'Impossible de créer le compte'
      }, 400)
    }

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        slug: validated.tenant_slug,
        name: validated.tenant_name,
        subscription_plan: SubscriptionPlan.FREE,
        subscription_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days trial
        current_users_count: 1,
        current_interventions_count: 0
      })
      .select()
      .single()

    if (tenantError || !tenant) {
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('Tenant creation error:', tenantError)
      return c.json({
        error: 'Registration Failed',
        message: 'Impossible de créer l\'organisation'
      }, 500)
    }

    // Create user record
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        tenant_id: tenant.id,
        email: validated.email,
        full_name: validated.full_name,
        role: UserRole.OWNER,
        is_active: true,
        email_verified: true
      })
      .select()
      .single()

    if (userError || !user) {
      // Rollback: delete tenant and auth user
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      console.error('User creation error:', userError)
      return c.json({
        error: 'Registration Failed',
        message: 'Impossible de créer l\'utilisateur'
      }, 500)
    }

    // Generate access token
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: validated.email
    })

    return c.json({
      message: 'Inscription réussie',
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        subscription_plan: tenant.subscription_plan
      }
    }, 201)
  } catch (error: any) {
    console.error('Registration error:', error)
    if (error.name === 'ZodError') {
      return c.json({
        error: 'Validation Error',
        message: 'Données invalides',
        details: error.errors
      }, 400)
    }
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue lors de l\'inscription'
    }, 500)
  }
})

/**
 * POST /api/auth/login
 * Login with email and password
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const validated = loginSchema.parse(body)

    // Sign in with Supabase
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: validated.email,
      password: validated.password
    })

    if (error || !data.user) {
      return c.json({
        error: 'Authentication Failed',
        message: 'Email ou mot de passe incorrect'
      }, 401)
    }

    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*, tenants(*)')
      .eq('id', data.user.id)
      .single()

    if (userError || !user) {
      return c.json({
        error: 'Authentication Failed',
        message: 'Utilisateur non trouvé'
      }, 401)
    }

    return c.json({
      message: 'Connexion réussie',
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_at: data.session?.expires_at,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        tenant_id: user.tenant_id
      },
      tenant: user.tenants
    })
  } catch (error: any) {
    console.error('Login error:', error)
    if (error.name === 'ZodError') {
      return c.json({
        error: 'Validation Error',
        message: 'Données invalides',
        details: error.errors
      }, 400)
    }
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue lors de la connexion'
    }, 500)
  }
})

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
auth.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const { refresh_token } = body

    if (!refresh_token) {
      return c.json({
        error: 'Bad Request',
        message: 'Refresh token manquant'
      }, 400)
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token
    })

    if (error || !data.session) {
      return c.json({
        error: 'Refresh Failed',
        message: 'Token de rafraîchissement invalide'
      }, 401)
    }

    return c.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    })
  } catch (error) {
    console.error('Refresh error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue lors du rafraîchissement du token'
    }, 500)
  }
})

/**
 * POST /api/auth/logout
 * Logout (revoke session)
 */
auth.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ message: 'Déconnexion réussie' })
    }

    const token = authHeader.substring(7)
    await supabaseAdmin.auth.admin.signOut(token)

    return c.json({ message: 'Déconnexion réussie' })
  } catch (error) {
    console.error('Logout error:', error)
    return c.json({ message: 'Déconnexion réussie' })
  }
})

export default auth
