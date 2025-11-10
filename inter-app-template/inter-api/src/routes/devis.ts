import { Hono } from 'hono'
import { getAuth } from '../middleware/auth.js'
import { requireFeature, checkUsageLimit } from '../middleware/feature-flags.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { createDevisSchema, updateDevisSchema, paginationSchema } from '../lib/validation.js'

const devis = new Hono()

// All devis routes require Starter+ plan
devis.use('/*', requireFeature('devis'))

/**
 * GET /api/devis
 * List all devis for tenant
 */
devis.get('/', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const query = c.req.query()
    const { page, per_page } = paginationSchema.parse(query)

    const from = (page - 1) * per_page
    const to = from + per_page - 1

    const { data, error, count } = await supabaseAdmin
      .from('devis')
      .select('*, clients(*)', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('List devis error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la récupération des devis'
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
    console.error('List devis error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * GET /api/devis/:id
 * Get single devis
 */
devis.get('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    const { data, error } = await supabaseAdmin
      .from('devis')
      .select('*, clients(*), interventions(*), created_by:users!created_by_user_id(*)')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (error || !data) {
      return c.json({
        error: 'Not Found',
        message: 'Devis non trouvé'
      }, 404)
    }

    return c.json(data)
  } catch (error) {
    console.error('Get devis error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * POST /api/devis
 * Create new devis with automatic numero generation
 */
devis.post('/', checkUsageLimit('devis'), async (c) => {
  try {
    const { tenant, user } = getAuth(c)
    const body = await c.req.json()
    const validated = createDevisSchema.parse(body)

    // Calculate totals
    let subtotal_ht = 0
    const items = validated.items.map((item) => {
      const total_ht = item.quantity * item.unit_price
      subtotal_ht += total_ht
      return {
        ...item,
        total_ht
      }
    })

    const tax_amount = subtotal_ht * (validated.tax_rate / 100)
    const total_ttc = subtotal_ht + tax_amount

    // Generate numero (DEV-YYYY-XXXX)
    const year = new Date().getFullYear()
    const { count } = await supabaseAdmin
      .from('devis')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', `${year}-01-01`)

    const nextNumber = (count || 0) + 1
    const numero = `DEV-${year}-${String(nextNumber).padStart(4, '0')}`

    const { data, error } = await supabaseAdmin
      .from('devis')
      .insert({
        tenant_id: tenant.id,
        client_id: validated.client_id,
        intervention_id: validated.intervention_id,
        numero,
        status: 'draft',
        date_emission: validated.date_emission,
        date_validite: validated.date_validite,
        items,
        subtotal_ht,
        tax_rate: validated.tax_rate,
        tax_amount,
        total_ttc,
        notes: validated.notes,
        conditions: validated.conditions,
        created_by_user_id: user.id
      })
      .select('*, clients(*)')
      .single()

    if (error) {
      console.error('Create devis error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la création du devis'
      }, 500)
    }

    return c.json(data, 201)
  } catch (error: any) {
    console.error('Create devis error:', error)
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
 * PATCH /api/devis/:id
 * Update devis (recalculates totals if items changed)
 */
devis.patch('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')
    const body = await c.req.json()
    const validated = updateDevisSchema.parse(body)

    // If items are being updated, recalculate totals
    let updateData: any = { ...validated }

    if (validated.items) {
      let subtotal_ht = 0
      const items = validated.items.map((item) => {
        const total_ht = item.quantity * item.unit_price
        subtotal_ht += total_ht
        return {
          ...item,
          total_ht
        }
      })

      const tax_rate = validated.tax_rate || 20 // default
      const tax_amount = subtotal_ht * (tax_rate / 100)
      const total_ttc = subtotal_ht + tax_amount

      updateData = {
        ...updateData,
        items,
        subtotal_ht,
        tax_amount,
        total_ttc
      }
    }

    const { data, error } = await supabaseAdmin
      .from('devis')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .select('*, clients(*)')
      .single()

    if (error) {
      console.error('Update devis error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la mise à jour du devis'
      }, 500)
    }

    return c.json(data)
  } catch (error: any) {
    console.error('Update devis error:', error)
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
 * DELETE /api/devis/:id
 * Delete devis
 */
devis.delete('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    // Check if devis is linked to a facture
    const { count } = await supabaseAdmin
      .from('factures')
      .select('id', { count: 'exact', head: true })
      .eq('devis_id', id)
      .eq('tenant_id', tenant.id)

    if (count && count > 0) {
      return c.json({
        error: 'Validation Error',
        message: 'Impossible de supprimer ce devis car il est lié à une facture'
      }, 400)
    }

    const { error } = await supabaseAdmin
      .from('devis')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) {
      console.error('Delete devis error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la suppression du devis'
      }, 500)
    }

    return c.json({ message: 'Devis supprimé avec succès' })
  } catch (error) {
    console.error('Delete devis error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * POST /api/devis/:id/accept
 * Accept a devis (change status to accepted)
 */
devis.post('/:id/accept', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    const { data, error } = await supabaseAdmin
      .from('devis')
      .update({ status: 'accepted' })
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .select('*, clients(*)')
      .single()

    if (error) {
      console.error('Accept devis error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de l\'acceptation du devis'
      }, 500)
    }

    return c.json(data)
  } catch (error) {
    console.error('Accept devis error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

export default devis
