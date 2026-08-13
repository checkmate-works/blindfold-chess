'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * The current URL (path + query, locale-prefixed) for use as a post-auth `next`
 * redirect target — so a members-only CTA can return the user to exactly where
 * they were after signing in. `usePathname()` includes the `/[locale]` segment,
 * which is what `/auth/callback` needs to build the redirect. The value is
 * validated (open-redirect guard) by `resolveReturnPath` at every consumption point.
 */
export function useCurrentPathAsNext(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}
