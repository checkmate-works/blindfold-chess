/**
 * My Problems Index (`/mypage/problems`)
 *
 * @description
 * Index page for user-created problems. Links to Position Memory and Puzzle
 * sub-sections.
 */
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { ChallengeCard } from '@/app/_components';

import { Divider, PagePanel, PageTitle } from '@/app/[locale]/_components';
import { Breadcrumb } from '@/app/[locale]/_components/Breadcrumb';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageProblemsIndex' });

  return {
    title: resolveTitle(t('title'), locale),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function ProblemsIndexPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageProblemsIndex' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        <div className="flex flex-wrap gap-3">
          <ChallengeCard
            locale={locale}
            href="/mypage/problems/memory"
            label={t('positionMemory')}
            icon="🧠"
          />
          <ChallengeCard
            locale={locale}
            href="/mypage/problems/puzzles"
            label={t('puzzles')}
            icon="🧩"
          />
        </div>

        <Divider />

        <Breadcrumb
          locale={locale}
          items={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
        />
      </PagePanel>
    </div>
  );
}
