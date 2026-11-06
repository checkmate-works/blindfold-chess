import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client (anon key, cookie session). Returns `null` with a
 * console warning instead of throwing when the public env vars are missing,
 * so callers must handle the absent client.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase client not created: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing'
    );
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
