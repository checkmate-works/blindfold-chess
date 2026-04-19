/**
 * Legacy score detail shim (`/leaderboard/[period]/[module]/[key]` — 308 redirect)
 *
 * @description
 * Absorbs the pre-refactor period-first URL shape and redirects to the
 * canonical category-first form
 * `/leaderboard/score/[period]/[module-slug]/[key]`. All three path segments
 * are strictly validated against the current value sets — any mismatch 404s.
 *
 * The `[module]` path segment is expected to be the hyphenated slug form
 * (e.g. `coordinate-quiz`), which is what the pre-refactor route already
 * accepted, so existing inbound links keep working verbatim.
 *
 * `?page=` is preserved on the redirect so deep-linked pagination survives.
 */
import { notFound, permanentRedirect } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { slugToModule } from '../../../_lib/types';
import { isValidKey, isValidModuleSlug, isValidPeriod } from '../../../_lib/validators';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
    module: string;
    key: string;
  }>;
  searchParams: Promise<{
    page?: string | string[];
  }>;
};

export default async function LegacyLeaderboardDetailRedirect({ params, searchParams }: Props) {
  const { locale, period, module: moduleSlug, key } = await params;

  if (!isValidPeriod(period)) notFound();
  if (!isValidModuleSlug(moduleSlug)) notFound();

  const resolvedModule = slugToModule(moduleSlug);
  if (!resolvedModule || !isValidKey(resolvedModule, key)) notFound();

  const { page: pageParam } = await searchParams;
  const rawPage = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const pageQuery = rawPage ? `?page=${encodeURIComponent(rawPage)}` : '';

  permanentRedirect(`/${locale}/leaderboard/score/${period}/${moduleSlug}/${key}${pageQuery}`);
}
