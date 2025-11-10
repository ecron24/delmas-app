import { Hono } from 'hono'
import { getAuth } from '../middleware/auth.js'
import { requireFeature, checkUsageLimit } from '../middleware/feature-flags.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { createFactureSchema, updateFactureSchema, paginationSchema } from '../lib/validation.js'

const factures = new Hono()

// All facture routes require Starter+ plan
factures.use('/*', requireFeature('factures'))

/**
 * GET /api/factures
 * List all factures for tenant
 */
factures.get('/', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const query = c.req.query()
    const { page, per_page } = paginationSchema.parse(query)

    const from = (page - 1) * per_page
    const to = from + per_page - 1

    const { data, error, count } = await supabaseAdmin
      .from('factures')
      .select('*, clients(*)', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('List factures error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la récupération des factures'
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
    console.error('List factures error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * GET /api/factures/:id
 * Get single facture
 */
factures.get('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    const { data, error } = await supabaseAdmin
      .from('factures')
      .select('*, clients(*), devis(*), interventions(*), created_by:users!created_by_user_id(*)')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (error || !data) {
      return c.json({
        error: 'Not Found',
        message: 'Facture non trouvée'
      }, 404)
    }

    return c.json(data)
  } catch (error) {
    console.error('Get facture error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * POST /api/factures
 * Create new facture with automatic numero generation
 */
factures.post('/', checkUsageLimit('factures'), async (c) => {
  try {
    const { tenant, user } = getAuth(c)
    const body = await c.req.json()
    const validated = createFactureSchema.parse(body)

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

    // Generate numero (FAC-YYYY-XXXX)
    const year = new Date().getFullYear()
    const { count } = await supabaseAdmin
      .from('factures')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', `${year}-01-01`)

    const nextNumber = (count || 0) + 1
    const numero = `FAC-${year}-${String(nextNumber).padStart(4, '0')}`

    const { data, error } = await supabaseAdmin
      .from('factures')
      .insert({
        tenant_id: tenant.id,
        client_id: validated.client_id,
        devis_id: validated.devis_id,
        intervention_id: validated.intervention_id,
        numero,
        status: 'draft',
        date_emission: validated.date_emission,
        date_echeance: validated.date_echeance,
        items,
        subtotal_ht,
        tax_rate: validated.tax_rate,
        tax_amount,
        total_ttc,
        amount_paid: 0,
        amount_due: total_ttc,
        payment_method: validated.payment_method,
        notes: validated.notes,
        exported_to_accounting: false,
        created_by_user_id: user.id
      })
      .select('*, clients(*)')
      .single()

    if (error) {
      console.error('Create facture error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la création de la facture'
      }, 500)
    }

    return c.json(data, 201)
  } catch (error: any) {
    console.error('Create facture error:', error)
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
 * PATCH /api/factures/:id
 * Update facture
 */
factures.patch('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')
    const body = await c.req.json()
    const validated = updateFactureSchema.parse(body)

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

      // Get current amount_paid
      const { data: currentFacture } = await supabaseAdmin
        .from('factures')
        .select('amount_paid')
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .single()

      const amount_paid = currentFacture?.amount_paid || 0
      const amount_due = total_ttc - amount_paid

      updateData = {
        ...updateData,
        items,
        subtotal_ht,
        tax_amount,
        total_ttc,
        amount_due
      }
    }

    const { data, error } = await supabaseAdmin
      .from('factures')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .select('*, clients(*)')
      .single()

    if (error) {
      console.error('Update facture error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la mise à jour de la facture'
      }, 500)
    }

    return c.json(data)
  } catch (error: any) {
    console.error('Update facture error:', error)
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
 * POST /api/factures/:id/payment
 * Record payment for a facture
 */
factures.post('/:id/payment', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')
    const body = await c.req.json()
    const { amount, payment_method, payment_reference } = body

    if (!amount || amount <= 0) {
      return c.json({
        error: 'Validation Error',
        message: 'Le montant du paiement doit être supérieur à 0'
      }, 400)
    }

    // Get current facture
    const { data: facture, error: fetchError } = await supabaseAdmin
      .from('factures')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (fetchError || !facture) {
      return c.json({
        error: 'Not Found',
        message: 'Facture non trouvée'
      }, 404)
    }

    const newAmountPaid = facture.amount_paid + amount
    const newAmountDue = facture.total_ttc - newAmountPaid

    if (newAmountPaid > facture.total_ttc) {
      return c.json({
        error: 'Validation Error',
        message: 'Le montant payé dépasse le montant total de la facture'
      }, 400)
    }

    // Determine new status
    let newStatus = facture.status
    if (newAmountDue === 0) {
      newStatus = 'paid'
    } else if (newAmountPaid > 0 && newAmountDue > 0) {
      newStatus = 'partially_paid'
    }

    const { data, error } = await supabaseAdmin
      .from('factures')
      .update({
        amount_paid: newAmountPaid,
        amount_due: newAmountDue,
        status: newStatus,
        payment_method: payment_method || facture.payment_method,
        payment_reference: payment_reference || facture.payment_reference,
        date_paiement: newAmountDue === 0 ? new Date().toISOString() : facture.date_paiement
      })
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .select('*, clients(*)')
      .single()

    if (error) {
      console.error('Record payment error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de l\'enregistrement du paiement'
      }, 500)
    }

    return c.json(data)
  } catch (error) {
    console.error('Record payment error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * POST /api/factures/:id/export-accounting
 * Export facture to accounting (Pro+ only)
 */
factures.post('/:id/export-accounting', requireFeature('comptabilite'), async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    // TODO: Implement actual accounting export logic here
    // For now, just mark as exported

    const { data, error } = await supabaseAdmin
      .from('factures')
      .update({
        exported_to_accounting: true,
        accounting_export_date: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .select('*, clients(*)')
      .single()

    if (error) {
      console.error('Export accounting error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de l\'export comptable'
      }, 500)
    }

    return c.json(data)
  } catch (error) {
    console.error('Export accounting error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

/**
 * DELETE /api/factures/:id
 * Delete facture
 */
factures.delete('/:id', async (c) => {
  try {
    const { tenant } = getAuth(c)
    const id = c.req.param('id')

    // Check if facture has payments
    const { data: facture } = await supabaseAdmin
      .from('factures')
      .select('amount_paid')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (facture && facture.amount_paid > 0) {
      return c.json({
        error: 'Validation Error',
        message: 'Impossible de supprimer une facture avec des paiements enregistrés'
      }, 400)
    }

    const { error } = await supabaseAdmin
      .from('factures')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenant.id)

    if (error) {
      console.error('Delete facture error:', error)
      return c.json({
        error: 'Database Error',
        message: 'Erreur lors de la suppression de la facture'
      }, 500)
    }

    return c.json({ message: 'Facture supprimée avec succès' })
  } catch (error) {
    console.error('Delete facture error:', error)
    return c.json({
      error: 'Internal Server Error',
      message: 'Une erreur est survenue'
    }, 500)
  }
})

export default factures
