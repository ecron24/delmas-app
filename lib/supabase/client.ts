import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ✅ Helper pour requêtes sur le schéma piscine_delmas_public
export function fromDelmas(table: string) {
  const client = createClient();
  return client.schema('piscine_delmas_public').from(table);
}
