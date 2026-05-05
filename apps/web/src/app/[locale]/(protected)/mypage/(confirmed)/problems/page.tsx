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

import { PageLayout } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

type Props = LocalePageProps;

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
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
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
    </PageLayout>
  );
}
