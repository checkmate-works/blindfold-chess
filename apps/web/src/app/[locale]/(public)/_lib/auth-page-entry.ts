import { redirect } from 'next/navigation';

import { getOptionalUser } from '@/lib/auth';
import { resolveReturnPath } from '@/lib/auth-return-path';

import type { Locale } from '@/app/[locale]/_lib/types';

export type AuthPageProps = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ error?: string; next?: string }>;
};

export type AuthPageEntry = {
  locale: Locale;
  /** The `?error=` code an OAuth or email step bounced back with, if any. */
  error: string | undefined;
  /**
   * Where to land once signed in (a CTA-gated page passes its own URL), or
   * null to fall back to the page's default. Already validated to an
   * internal path, so it can be used in a redirect or link as is.
   */
  next: string | null;
};

/**
 * What the sign-in and sign-up pages do before rendering anything.
 *
 * Both are useless without a Supabase project to talk to, so a missing
 * configuration fails loudly at the page rather than as a blank form. Both
 * take a `?next=` that has to be re-validated on read (see
 * `resolveReturnPath`), and both send an already-signed-in visitor on — to
 * that return path, or to the account page with an "already logged in" toast.
 * `redirect` throws, so a caller past this line has an anonymous visitor.
 */
export async function resolveAuthPageEntry({
  params,
  searchParams,
}: AuthPageProps): Promise<AuthPageEntry> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase environment variables are not configured. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  const { locale } = await params;

  const { error, next: nextRaw } = await searchParams;
  const next = resolveReturnPath(nextRaw);

  const user = await getOptionalUser();

  if (user) {
    redirect(next ?? `/${locale}/mypage?toast=already_logged_in`);
  }

  return { locale, error, next };
}
