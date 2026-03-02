import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PagePanel, PageTitle } from '../_components';
import { generateCanonicalMetadata } from '../_lib/metadata';
import { MypageContent } from './_components/MypageContent';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.mypage' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'mypage' }),
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

export default async function MypagePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Mypage' });

  return (
    <div className="space-y-8">
      <PageTitle>{t('title')}</PageTitle>
      <PagePanel>
        <MypageContent />
      </PagePanel>
    </div>
  );
}
