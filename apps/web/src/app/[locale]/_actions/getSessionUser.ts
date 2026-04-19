'use server';

import type { User } from '@supabase/supabase-js';

import { createClient as createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Returns the currently-authenticated Supabase user, or `null` for anonymous
 * visitors. Invoked by `AuthProvider` on mount so the client can decide
 * whether to load the Supabase browser SDK.
 *
 * Reading the session on the server (instead of in the root layout) keeps
 * `[locale]/layout.tsx` free of `cookies()` reads, which is the prerequisite
 * for ISR on descendant pages (see F-003 Group A).
 *
 * Any failure (misconfigured env, transient server error, etc.) is coerced
 * to `null` so the client renders as unauthenticated rather than erroring.
 */
export async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
