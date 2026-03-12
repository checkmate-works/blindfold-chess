import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import type { Locale } from '@/app/[locale]/_lib/types';

import { Step1Client } from './_components/Step1Client';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'onboarding/step1' }),
    title: t('pageTitle', { step: 1 }),
  };
}

export default async function Step1Page(props: Props) {
  const { locale } = await props.params;

  return <Step1Client locale={locale} />;
}
