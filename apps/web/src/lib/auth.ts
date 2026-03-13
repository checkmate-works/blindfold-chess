import { cache } from 'react';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * Returns the authenticated user or redirects to sign-in.
 *
 * Intended for use within `(protected)/` routes where the parent layout
 * already performs an auth guard. The redirect here is a fallback that
 * should never be reached under normal conditions.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in?toast=sign_in_required');
  }
  return user;
});

/**
 * Returns the authenticated user or `null` without redirecting.
 *
 * Use this in contexts where unauthenticated access is expected
 * (e.g., Server Actions called from outside `(protected)/` routes).
 */
export const getOptionalUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
