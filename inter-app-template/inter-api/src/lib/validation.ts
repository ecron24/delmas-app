import { z } from 'zod'

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  full_name: z.string().min(2, 'Le nom complet doit contenir au moins 2 caractères'),
  tenant_slug: z.string()
    .min(3, 'Le slug doit contenir au moins 3 caractères')
    .max(50, 'Le slug ne peut pas dépasser 50 caractères')
    .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
  tenant_name: z.string().min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères')
})

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis')
})

// Client schemas
export const createClientSchema = z.object({
  type: z.enum(['individual', 'company']),
  first_name: z.string().min(1).optional().nullable(),
  last_name: z.string().min(1).optional().nullable(),
  company_name: z.string().min(1).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  mobile: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  siret: z.string().optional().nullable(),
  vat_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable()
}).refine((data) => {
  if (data.type === 'individual') {
    return data.first_name && data.last_name
  } else {
    return data.company_name
  }
}, {
  message: 'Pour un particulier, prénom et nom sont requis. Pour une entreprise, le nom de société est requis.'
})

export const updateClientSchema = createClientSchema.partial()

// Intervention schemas
export const createInterventionSchema = z.object({
  client_id: z.string().uuid('ID client invalide'),
  assigned_to_user_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3, 'Le titre doit contenir au moins 3 caractères'),
  description: z.string().optional().nullable(),
  status: z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  scheduled_at: z.string().datetime().optional().nullable(),
  estimated_duration: z.number().positive().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  technician_notes: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable()
})

export const updateInterventionSchema = createInterventionSchema.partial()

// Devis schemas
export const devisItemSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(1, 'La description est requise'),
  quantity: z.number().positive('La quantité doit être positive'),
  unit_price: z.number().nonnegative('Le prix unitaire doit être positif ou nul'),
  tax_rate: z.number().min(0).max(100, 'Le taux de TVA doit être entre 0 et 100')
})

export const createDevisSchema = z.object({
  client_id: z.string().uuid('ID client invalide'),
  intervention_id: z.string().uuid().optional().nullable(),
  date_emission: z.string().datetime(),
  date_validite: z.string().datetime(),
  items: z.array(devisItemSchema).min(1, 'Au moins un article est requis'),
  tax_rate: z.number().min(0).max(100),
  notes: z.string().optional().nullable(),
  conditions: z.string().optional().nullable()
})

export const updateDevisSchema = createDevisSchema.partial()

// Facture schemas
export const factureItemSchema = devisItemSchema

export const createFactureSchema = z.object({
  client_id: z.string().uuid('ID client invalide'),
  devis_id: z.string().uuid().optional().nullable(),
  intervention_id: z.string().uuid().optional().nullable(),
  date_emission: z.string().datetime(),
  date_echeance: z.string().datetime(),
  items: z.array(factureItemSchema).min(1, 'Au moins un article est requis'),
  tax_rate: z.number().min(0).max(100),
  payment_method: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
})

export const updateFactureSchema = createFactureSchema.partial()

// Pagination schema
export const paginationSchema = z.object({
  page: z.coerce.number().positive().default(1),
  per_page: z.coerce.number().positive().max(100).default(20)
})
