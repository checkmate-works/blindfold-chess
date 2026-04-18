/**
 * Exp Leaderboard (`/leaderboard/exp/[period]`)
 *
 * @description
 * Canonical category-first exp leaderboard. Displays cumulative Exp rankings
 * sourced from the `user_exp` table. Shows top 50 users ranked by total
 * experience points, with level derived dynamically via `getLevel(totalExp)`.
 * The period is path-based.
 *
 * @flow
 * - Score/Exp category tabs
 * - Period tabs: weekly / monthly / all-time
 * - ExpLeaderboardTable: Ranked rows with avatar, username, total Exp, level
 * - Back link to the canonical Score all-time leaderboard
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';
import { Link } from '@/i18n/routing';

import { AdSenseGuard } from '@/app/[locale]/_components/AdSense/AdSenseGuard';
import { PagePanel } from '@/app/[locale]/_components/PagePanel';
import { SectionTitle } from '@/app/[locale]/_components/SectionTitle';
import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LeaderboardTabs } from '../../_components/LeaderboardTabs';
import { PeriodTabs } from '../../_components/PeriodTabs';
import type { LeaderboardPeriod } from '../../_lib/types';
import { isValidPeriod } from '../../_lib/validators';
import { getExpLeaderboard } from '../_actions/getExpLeaderboard';
import { ExpLeaderboardTable } from '../_components/ExpLeaderboardTable';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{
    locale: Locale;
    period: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, period: periodParam } = await params;
  if (!isValidPeriod(periodParam)) return {};
  const t = await getTranslations({ locale, namespace: 'metadata.expLeaderboard' });

  const title = t('title');
  const description = t('description');

  return {
    ...generateCanonicalMetadata({
      locale,
      path: `leaderboard/exp/${periodParam}`,
      title,
      description,
    }),
    title: resolveTitle(title, locale),
    description,
  };
}

export default async function ExpLeaderboardPeriodPage({ params }: Props) {
  const { locale, period: periodParam } = await params;
  if (!isValidPeriod(periodParam)) {
    notFound();
  }
  const period: LeaderboardPeriod = periodParam;
  const { rows } = await getExpLeaderboard(period);
  const tExp = await getTranslations({ locale, namespace: 'expLeaderboard' });
  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  return (
    <PagePanel>
      <SectionTitle>{tExp('title')}</SectionTitle>

      <LeaderboardTabs activeTab="exp" locale={locale} period={period} />

      <PeriodTabs
        currentPeriod={period}
        locale={locale}
        hrefs={{
          'all-time': `/${locale}/leaderboard/exp/all-time`,
          weekly: `/${locale}/leaderboard/exp/weekly`,
          monthly: `/${locale}/leaderboard/exp/monthly`,
        }}
      />

      <ExpLeaderboardTable rows={rows} locale={locale} />

      {/*
        Back link targets the literal canonical Score All-Time leaderboard —
        NOT the current period — per product decision. The exp page sends
        users back to the main score landing regardless of which period they
        were viewing.
      */}
      <div className="mt-4 text-center">
        <Link
          href="/leaderboard/score/all-time"
          locale={locale}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {t('backToList')}
        </Link>
      </div>

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}
    </PagePanel>
  );
}
