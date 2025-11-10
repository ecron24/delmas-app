import { Context, Next } from 'hono'
import { getAuth } from './auth.js'
import { PLAN_FEATURES } from '../types/index.js'

/**
 * Middleware to check if tenant has access to a specific feature
 * @param feature Feature name to check
 */
export const requireFeature = (feature: string) => {
  return async (c: Context, next: Next) => {
    const { tenant } = getAuth(c)

    const planFeatures = PLAN_FEATURES[tenant.subscription_plan]

    // Enterprise has access to all features
    if (planFeatures.features.includes('*')) {
      return await next()
    }

    // Check if feature is included in plan
    if (!planFeatures.features.includes(feature)) {
      return c.json({
        error: 'Feature Not Available',
        message: `Cette fonctionnalité n'est pas disponible dans votre plan ${planFeatures.name}. Veuillez mettre à niveau votre abonnement.`,
        required_plan: getMinimumPlanForFeature(feature),
        current_plan: tenant.subscription_plan
      }, 403)
    }

    await next()
  }
}

/**
 * Get minimum plan required for a feature
 */
const getMinimumPlanForFeature = (feature: string): string => {
  for (const [plan, config] of Object.entries(PLAN_FEATURES)) {
    if (config.features.includes(feature) || config.features.includes('*')) {
      return config.name
    }
  }
  return 'Enterprise'
}

/**
 * Check if tenant has reached usage limit
 * @param resource Resource type (interventions, clients, etc.)
 */
export const checkUsageLimit = (resource: 'interventions' | 'clients' | 'devis' | 'factures') => {
  return async (c: Context, next: Next) => {
    const { tenant } = getAuth(c)

    const planFeatures = PLAN_FEATURES[tenant.subscription_plan]
    const limit = planFeatures.limits[resource]

    // -1 means unlimited
    if (limit === -1) {
      return await next()
    }

    // Check current usage (you'll need to implement usage tracking)
    const currentUsage = (tenant as any)[`current_${resource}_count`] || 0

    if (currentUsage >= limit) {
      return c.json({
        error: 'Usage Limit Reached',
        message: `Vous avez atteint la limite de ${limit} ${resource} pour votre plan ${planFeatures.name}.`,
        current_usage: currentUsage,
        limit: limit,
        upgrade_message: 'Veuillez mettre à niveau votre abonnement pour augmenter cette limite.'
      }, 429) // 429 Too Many Requests
    }

    await next()
  }
}

/**
 * Check if tenant has reached user limit
 */
export const checkUserLimit = async (c: Context, next: Next) => {
  const { tenant } = getAuth(c)

  const planFeatures = PLAN_FEATURES[tenant.subscription_plan]
  const maxUsers = planFeatures.maxUsers

  // -1 means unlimited
  if (maxUsers === -1) {
    return await next()
  }

  if (tenant.current_users_count >= maxUsers) {
    return c.json({
      error: 'User Limit Reached',
      message: `Vous avez atteint la limite de ${maxUsers} utilisateur(s) pour votre plan ${planFeatures.name}.`,
      current_users: tenant.current_users_count,
      max_users: maxUsers
    }, 429)
  }

  await next()
}
