import { Hono } from 'hono'
import { getAuth } from '../middleware/auth.js'
import { checkUsageLimit } from '../middleware/feature-flags.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { createInterventionSchema, updateInterventionSchema, paginationSchema } from '../lib/validation.js'

const interventions = new Hono()

/**
 * GET /api/interventions
 * List all interventions for tenant
 */
interventions.get('/', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const query = c.req.query()
    const { page, per_page } = paginationSchema.parse(query)

    const from = (page - 1) * per_page
    const to = from + per_page - 1

    // Get interventions with client data
    const { data, error, count } = await supabaseAdmin
      .from('interventions')
      .select('*, clients(*), assigned_to:users!assigned_to_user_id(*)', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('List interventions error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la récupération des interventions'
      }, 500)
    }

    return c.json({
      data: data || [],
      pagination: {
        page,
        per_page,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / per_page)
      }
    })
  } catch (error) {
    console.error('List interventions error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * GET /api/interventions/:id
 * Get single intervention
 */
interventions.get('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    const { data, error } = await supabaseAdmin
      .from('interventions')
      .select('*, clients(*), assigned_to:users!assigned_to_user_id(*), created_by:users!created_by_user_id(*)')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (error || !data) {
      return c.json({
        error: 'Not Found',
        message: 'Intervention non trouvée'
      }, 404)
    }

    return c.json(data)
  } catch (error) {
    console.error('Get intervention error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * POST /api/interventions
 * Create new intervention
 */
interventions.post('/', checkUsageLimit('interventions'), async (c) => {
  try {
    const { tenant, user } = getAuth(c)
    const body = await c.req.json()
    const validated = createInterventionSchema.parse(body)

    // Verify client belongs to tenant
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', validated.client_id)
      .eq('tenant_id', tenant.id)
      .single()

    if (clientError || !client) {
      return c.json({
        error: 'Validation Error',
        message: 'Client non trouvé ou n\'appartient pas à votre organisation'
      }, 400)
    }

    // If assigned_to_user_id is provided, verify user belongs to tenant
    if (validated.assigned_to_user_id) {
      const { data: assignedUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', validated.assigned_to_user_id)
        .eq('tenant_id', tenant.id)
        .single()

      if (userError || !assignedUser) {
        return c.json({
          error: 'Validation Error',
          message: 'Utilisateur assigné non trouvé ou n\'appartient pas à votre organisation'
        }, 400)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('interventions')
      .insert({
        ...validated,
        tenant_id: tenant.id,
        created_by_user_id: user.id
      })
      .select('*, clients(*), assigned_to:users!assigned_to_user_id(*)')
      .single()

    if (error) {
      console.error('Create intervention error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la création de l\'intervention'
      }, 500)
    }

    // Increment intervention count for tenant
    await supabaseAdmin
      .from('tenants')
      .update({ current_interventions_count: tenant.current_interventions_count + 1 })
      .eq('id', tenant.id)

    return c.json(data, 201)
  } catch (error: any) {
    console.error('Create intervention error:', error)
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
 * PATCH /api/interventions/:id
 * Update intervention
 */
interventions.patch('/:id', async (c) => {
  try {
    const { tenant, user } = getAuth(c)
    const id = c.req.param('id')
    const body = await c.req.json()
    const validated = updateInterventionSchema.parse(body)

    // Check intervention exists and belongs to tenant
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('interventions')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (existingError || !existing) {
      return c.json({
        error: 'Not Found',
        message: 'Intervention non trouvée'
      }, 404)
    }

    // If client_id is being updated, verify it belongs to tenant
    if (validated.client_id) {
      const { data: client, error: clientError } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', validated.client_id)
        .eq('tenant_id', tenant.id)
        .single()

      if (clientError || !client) {
        return c.json({
          error: 'Validation Error',
          message: 'Client non trouvé'
        }, 400)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('interventions')
      .update(validated)
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .select('*, clients(*), assigned_to:users!assigned_to_user_id(*)')
      .single()

    if (error) {
      console.error('Update intervention error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la mise à jour de l\'intervention'
      }, 500)
    }

    return c.json(data)
  } catch (error: any) {
    console.error('Update intervention error:', error)
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
 * DELETE /api/interventions/:id
 * Delete intervention
 */
interventions.delete('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    const { error } = await supabaseAdmin
      .from('interventions')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) {
      console.error('Delete intervention error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la suppression de l\'intervention'
      }, 500)
    }

    // Decrement intervention count
    await supabaseAdmin
      .from('tenants')
      .update({ current_interventions_count: Math.max(0, tenant.current_interventions_count - 1) })
      .eq('id', tenant.id)

    return c.json({ message: 'Intervention supprimée avec succès' })
  } catch (error) {
    console.error('Delete intervention error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

export default interventions
