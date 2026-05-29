/**
 * My Problems Index (`/mypage/problems`)
 *
 * @description
 * Index page for user-created problems. Links to Position Memory and Puzzle
 * sub-sections.
 */
import { getTranslations } from 'next-intl/server';

import { ChallengeCard } from '@/app/_components';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

type Props = LocalePageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'MypageProblemsIndex',
    path: 'mypage/problems',
    noIndex: true,
  });
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
