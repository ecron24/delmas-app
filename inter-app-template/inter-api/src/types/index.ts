// Subscription Plans
export enum SubscriptionPlan {
  FREE = 'free',
  STARTER = 'starter',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

// Plan features mapping
export const PLAN_FEATURES = {
  [SubscriptionPlan.FREE]: {
    name: 'Free',
    price: 0,
    maxUsers: 1,
    features: ['interventions'],
    limits: {
      interventions: 50,
      clients: 20
    }
  },
  [SubscriptionPlan.STARTER]: {
    name: 'Starter',
    price: 50,
    maxUsers: 2,
    features: ['interventions', 'calendar', 'devis', 'factures', 'white_label'],
    limits: {
      interventions: 500,
      clients: 200,
      devis: 100,
      factures: 100
    }
  },
  [SubscriptionPlan.PRO]: {
    name: 'Pro',
    price: 190,
    maxUsers: 10,
    features: ['interventions', 'calendar', 'devis', 'factures', 'white_label', 'comptabilite', 'team', 'advanced_stats'],
    limits: {
      interventions: -1, // unlimited
      clients: -1,
      devis: -1,
      factures: -1
    }
  },
  [SubscriptionPlan.ENTERPRISE]: {
    name: 'Enterprise',
    price: null, // custom pricing
    maxUsers: -1, // unlimited
    features: ['*'], // all features
    limits: {
      interventions: -1,
      clients: -1,
      devis: -1,
      factures: -1
    }
  }
} as const

// User Roles
export enum UserRole {
  OWNER = 'owner',          // Créateur du tenant
  ADMIN = 'admin',          // Administrateur
  MANAGER = 'manager',      // Manager (Pro+)
  TECHNICIAN = 'technician', // Technicien (Pro+)
  VIEWER = 'viewer'         // Lecture seule
}

// Database types
export interface Tenant {
  id: string
  slug: string // sous-domaine unique (ex: delmas)
  name: string // Nom commercial
  subscription_plan: SubscriptionPlan
  subscription_status: 'active' | 'cancelled' | 'past_due' | 'trial'
  trial_ends_at: string | null
  subscription_ends_at: string | null

  // White label settings
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  custom_domain: string | null

  // Metadata
  created_at: string
  updated_at: string

  // Usage tracking
  current_users_count: number
  current_interventions_count: number
}

export interface User {
  id: string
  tenant_id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null

  // Status
  is_active: boolean
  email_verified: boolean
  last_login_at: string | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface Intervention {
  id: string
  tenant_id: string
  client_id: string
  assigned_to_user_id: string | null

  // Basic info
  title: string
  description: string | null
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'

  // Scheduling (Starter+)
  scheduled_at: string | null
  completed_at: string | null
  estimated_duration: number | null // minutes

  // Location
  address: string | null
  latitude: number | null
  longitude: number | null

  // Attachments
  photos: string[] | null
  documents: string[] | null

  // Notes
  technician_notes: string | null
  internal_notes: string | null

  // Metadata
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  tenant_id: string

  // Basic info
  type: 'individual' | 'company'
  first_name: string | null
  last_name: string | null
  company_name: string | null
  email: string | null
  phone: string | null
  mobile: string | null

  // Address
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null

  // Business
  siret: string | null // Pour France
  vat_number: string | null

  // Notes
  notes: string | null
  tags: string[] | null

  // Metadata
  created_at: string
  updated_at: string
}

export interface Devis {
  id: string
  tenant_id: string
  client_id: string
  intervention_id: string | null

  // Identification
  numero: string // Format: DEV-2024-0001
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

  // Dates
  date_emission: string
  date_validite: string

  // Montants
  items: DevisItem[]
  subtotal_ht: number
  tax_rate: number
  tax_amount: number
  total_ttc: number

  // Notes
  notes: string | null
  conditions: string | null

  // Metadata
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface DevisItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  total_ht: number
}

export interface Facture {
  id: string
  tenant_id: string
  client_id: string
  devis_id: string | null
  intervention_id: string | null

  // Identification
  numero: string // Format: FAC-2024-0001
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled'

  // Dates
  date_emission: string
  date_echeance: string
  date_paiement: string | null

  // Montants
  items: FactureItem[]
  subtotal_ht: number
  tax_rate: number
  tax_amount: number
  total_ttc: number
  amount_paid: number
  amount_due: number

  // Paiement
  payment_method: string | null
  payment_reference: string | null

  // Export comptabilité (Pro+)
  exported_to_accounting: boolean
  accounting_export_date: string | null
  accounting_reference: string | null

  // Notes
  notes: string | null

  // Metadata
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface FactureItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  total_ht: number
}

// API Request/Response types
export interface AuthContext {
  user: User
  tenant: Tenant
}

export interface ApiError {
  error: string
  message: string
  code?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}
