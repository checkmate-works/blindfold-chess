import { createClient } from '@supabase/supabase-js';
import 'server-only';

import { fetchWithTimeout } from './fetch-with-timeout';

/**
 * Service-role Supabase client: bypasses RLS entirely, so every caller is
 * responsible for its own authorization (the cron jobs, for example, are
 * gated on `CRON_SECRET`). Creates a new client per call with no session
 * persistence.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      // Service-role calls also run on server-render / route-handler critical
      // paths, so they get the same deadline. See fetch-with-timeout.ts.
      global: { fetch: fetchWithTimeout },
    }
  );
}
