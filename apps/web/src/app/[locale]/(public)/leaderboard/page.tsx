import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';

import { Divider, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { getLeaderboard } from './_actions/getLeaderboard';
import { LeaderboardContainer } from './_components/LeaderboardContainer';
import type { LeaderboardModule, LeaderboardPeriod } from './_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

const DEFAULT_MODULE: LeaderboardModule = 'coordinate_quiz';
const DEFAULT_KEY = 'white';
const DEFAULT_PERIOD: LeaderboardPeriod = 'all-time';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return {
    ...generateCanonicalMetadata({ locale, path: 'leaderboard' }),
    title: t('leaderboard.title'),
    description: t('leaderboard.description'),
  };
}

export default async function LeaderboardPage({ params }: Props) {
  const { locale } = await params;
  const [t, supabase] = await Promise.all([getTranslations({ locale }), createClient()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const initialData = await getLeaderboard(DEFAULT_MODULE, DEFAULT_KEY, DEFAULT_PERIOD, 1);

  return (
    <div className="space-y-8">
      <PageTitle>{t('leaderboard.title')}</PageTitle>

      <LeaderboardContainer
        locale={locale}
        currentUserId={currentUserId}
        initialData={initialData}
        initialModule={DEFAULT_MODULE}
        initialKey={DEFAULT_KEY}
        initialPeriod={DEFAULT_PERIOD}
      />

      <Divider />

      <Breadcrumb items={[{ label: t('leaderboard.title') }]} locale={locale} />
    </div>
  );
}
