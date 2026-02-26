'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';

import { PageTitle } from '@/app/[locale]/_components/PageTitle';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ResultClient } from './_components/ResultClient';

export default function ResultPage() {
  const params = useParams();
  const locale = params.locale as Locale;
  const t = useTranslations('play');

  return (
    <>
      <div className="mb-8">
        <PageTitle>{t('title')}</PageTitle>
      </div>
      <ResultClient locale={locale} />
    </>
  );
}
