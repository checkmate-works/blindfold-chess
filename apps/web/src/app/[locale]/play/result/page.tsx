import { getTranslations } from 'next-intl/server';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './_components/ResultClient';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export default async function ResultPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'play' });

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
      </div>
      <ResultClient locale={locale} />
    </>
  );
}
