import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageLayout } from '@/app/[locale]/_components';
import { resolveTitle } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

import { MypageContent } from './_components/MypageContent';

type Props = LocalePageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypageChallenges' });

  return {
    title: resolveTitle(t('title'), locale),
    description: t('description'),
    robots: { index: false, follow: false },
  };
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
