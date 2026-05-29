import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { MypageContent } from './_components/MypageContent';

type Props = LocalePageProps;

export function generateMetadata({ params }: Props) {
  return createPageMetadata({
    params,
    namespace: 'metadata.mypageChallenges',
    path: 'mypage/challenges',
    noIndex: true,
  });
}

export default async function ChallengesPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'MypageChallenges' });

  return (
    <PageLayout
      title={t('title')}
      locale={locale}
      breadcrumb={[{ label: t('breadcrumbMypage'), href: '/mypage' }, { label: t('title') }]}
    >
      <MypageContent />
    </PageLayout>
  );
}
