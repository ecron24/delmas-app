// lib/supabase/webhook.ts
import { createClient } from '@supabase/supabase-js'

export function createWebhookClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← Clé service pour bypasser RLS
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
