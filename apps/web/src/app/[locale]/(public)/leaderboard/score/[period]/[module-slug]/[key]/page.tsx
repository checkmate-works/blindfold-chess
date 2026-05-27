/**
 * Score Leaderboard Detail (`/leaderboard/score/[period]/[module-slug]/[key]`)
 *
 * @description
 * Canonical category-first detail view for a single module+setting. Shows a
 * paginated table, a "Try This Challenge" CTA, and a back link to the middle
 * hub (which preserves the module selection).
 *
 * @flow
 * - SectionTitle (module + period label)
 * - PeriodSelector (select dropdown — this is the one surface where the
 *   discreet dropdown is kept; the two top-level pages use PeriodTabs instead)
 * - Paginated leaderboard table
 * - Full-width Try This Challenge CTA
 * - Back link to the middle hub `/leaderboard/score/[period]/[module-slug]`
 */
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';

import { createClient } from '@/lib/supabase/server';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import { LeaderboardDetailContent } from '@/app/[locale]/(public)/leaderboard/_components';
import { ChallengeLink } from '@/app/[locale]/(public)/leaderboard/_components/ChallengeLink';
import { PeriodSelector } from '@/app/[locale]/(public)/leaderboard/_components/PeriodSelector';
import {
  type LeaderboardModule,
  type LeaderboardPeriod,
  slugToModule,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import {
  isValidKey,
  isValidModuleSlug,
  isValidPeriod,
} from '@/app/[locale]/(public)/leaderboard/_lib/validators';
import { Divider, PagePanel } from '@/app/[locale]/_components';
import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
    'module-slug': string;
    key: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

type ValidatedParams = {
  period: LeaderboardPeriod;
  module: LeaderboardModule;
  moduleSlug: string;
  key: string;
};

function validateParams(
  periodStr: string,
  moduleSlug: string,
  key: string
): ValidatedParams | null {
  if (!isValidPeriod(periodStr)) return null;
  if (!isValidModuleSlug(moduleSlug)) return null;

  const resolvedModule = slugToModule(moduleSlug);
  if (!resolvedModule || !isValidKey(resolvedModule, key)) return null;

  return { period: periodStr, module: resolvedModule, moduleSlug, key };
}

export async function generateMetadata({ params }: Props) {
  const { locale, period, 'module-slug': moduleSlug, key } = await params;

  const validated = validateParams(period, moduleSlug, key);
  if (!validated) return {};

  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  const title = t(`cardTitle.${validated.module}.${validated.key}`);
  const periodLabel = t(`period.${validated.period}`);

  return {
    title: resolveTitle(`${title} (${periodLabel}) — ${t('title')}`, locale),
  };
}

export default async function ScoreLeaderboardDetailPage({ params, searchParams }: Props) {
  const { locale, period, 'module-slug': moduleSlug, key } = await params;
  const { page: pageParam } = await searchParams;

  const validated = validateParams(period, moduleSlug, key);
  if (!validated) notFound();

  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const data = await getLeaderboard(validated.module, validated.key, validated.period, page);
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  // ---------------------------------------------------------------------
  // Breadcrumb construction
  // ---------------------------------------------------------------------
  // The breadcrumb is composed of up to four items:
  //   1. Leaderboard top (score/[period])
  //   2. Module middle hub (score/[period]/[module-slug])
  //   3. Variant leaf (only for modules that have multiple keys)
  //
  // Previously the leaf used `cardTitle.${module}.${key}` which is the
  // full "Module — Variant" string (e.g. "Route Planner — Bishop"). That
  // duplicated the module name that already sits at position 2. For
  // modules with only a `default` key (square_colors, diagonal_quiz,
  // board_symmetry) it produced a two-in-a-row duplicate of the module
  // name instead.
  //
  // New rule:
  //   - `key === 'default'` → no leaf at all (breadcrumb ends at the hub)
  //   - otherwise         → leaf = variant-only label from
  //                         `leaderboard.setting.${module}.${key}`
  //
  // `cardTitle.*` is still used elsewhere (page `<SectionTitle>` text,
  // `generateMetadata` page title) and is intentionally left untouched
  // there — the full form reads naturally as a page title, only the
  // breadcrumb leaf needs dedup.
  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: t('title'), href: `/leaderboard/score/${validated.period}` },
    {
      label: t(`moduleFilter.${validated.module}`),
      href: `/leaderboard/score/${validated.period}/${validated.moduleSlug}`,
    },
  ];
  if (validated.key !== 'default') {
    breadcrumbItems.push({
      label: t(`setting.${validated.module}.${validated.key}`),
    });
  }

  return (
    <PagePanel>
      <LeaderboardDetailContent
        locale={locale}
        period={validated.period}
        module={validated.module}
        settingKey={validated.key}
        currentUserId={currentUserId}
        data={data}
        currentPage={page}
        periodSelector={
          <PeriodSelector
            currentPeriod={validated.period}
            hrefs={{
              'all-time': `/${locale}/leaderboard/score/all-time/${validated.moduleSlug}/${validated.key}`,
              weekly: `/${locale}/leaderboard/score/weekly/${validated.moduleSlug}/${validated.key}`,
              monthly: `/${locale}/leaderboard/score/monthly/${validated.moduleSlug}/${validated.key}`,
            }}
          />
        }
      />

      <ChallengeLink locale={locale} module={validated.module} settingKey={validated.key} />

      {/*
        Back link targets the middle hub (the module-filtered grid), so the
        user lands back on the module they were looking at rather than the
        unfiltered score top. Spacing mirrors `PracticeSetupActions` — `mt-4
        text-center` wrapper directly after the full-width primary button.
      */}
      <div className="mt-4 text-center">
        <Link
          href={`/leaderboard/score/${validated.period}/${validated.moduleSlug}`}
          locale={locale}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('backToList')}
        </Link>
      </div>

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}

      {/* Mirror `PageLayout`'s trailing block — see PageLayout.tsx. */}
      <div className="!mt-4 space-y-4">
        <Divider />
        <Breadcrumb items={breadcrumbItems} locale={locale} density="compact" />
      </div>
    </PagePanel>
  );
}
