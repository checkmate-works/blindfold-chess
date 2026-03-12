import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { Step3Client } from './_components/Step3Client';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'onboarding/step3' }),
    title: t('pageTitle', { step: 3 }),
  };
}

export default async function Step3Page(props: Props) {
  const { locale } = await props.params;

  return <Step3Client locale={locale} />;
}
