import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ADSENSE_SLOT_CONTENT_BOTTOM, IS_LOCAL_DEV } from '@/config';

import { createClient } from '@/lib/supabase/server';

import { getLeaderboard } from '@/app/[locale]/(public)/leaderboard/_actions/getLeaderboard';
import { LeaderboardDetailContent } from '@/app/[locale]/(public)/leaderboard/_components';
import { ChallengeLink } from '@/app/[locale]/(public)/leaderboard/_components/ChallengeLink';
import {
  type LeaderboardModule,
  type LeaderboardPeriod,
  slugToModule,
} from '@/app/[locale]/(public)/leaderboard/_lib/types';
import { isValidKey, isValidPeriod } from '@/app/[locale]/(public)/leaderboard/_lib/validators';
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
    module: string;
    key: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

type ValidatedParams = {
  period: LeaderboardPeriod;
  module: LeaderboardModule;
  key: string;
};

function validateParams(
  periodStr: string,
  moduleSlug: string,
  key: string
): ValidatedParams | null {
  if (!isValidPeriod(periodStr)) return null;

  const resolvedModule = slugToModule(moduleSlug);
  if (!resolvedModule || !isValidKey(resolvedModule, key)) return null;

  return { period: periodStr, module: resolvedModule, key };
}

export async function generateMetadata({ params }: Props) {
  const { locale, period, module: moduleSlug, key } = await params;

  const validated = validateParams(period, moduleSlug, key);
  if (!validated) return {};

  const t = await getTranslations({ locale, namespace: 'leaderboard' });

  const title = t(`cardTitle.${validated.module}.${validated.key}`);
  const periodLabel = t(`period.${validated.period}`);

  return {
    title: resolveTitle(`${title} (${periodLabel}) — ${t('title')}`, locale),
  };
}

export default async function LeaderboardDetailPage({ params, searchParams }: Props) {
  const { locale, period, module: moduleSlug, key } = await params;
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
  const detailTitle = t(`cardTitle.${validated.module}.${validated.key}`);

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
      />

      <ChallengeLink locale={locale} module={validated.module} settingKey={validated.key} />

      {(IS_LOCAL_DEV || ADSENSE_SLOT_CONTENT_BOTTOM) && (
        <AdSenseGuard slot="content-bottom" slotId={ADSENSE_SLOT_CONTENT_BOTTOM ?? ''} />
      )}

      <Divider />

      <Breadcrumb
        items={[{ label: t('title'), href: '/leaderboard' }, { label: detailTitle }]}
        locale={locale}
      />
    </PagePanel>
  );
}
