import { createClient } from '@supabase/supabase-js';
import 'server-only';

import { fetchWithTimeout } from './fetch-with-timeout';

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
