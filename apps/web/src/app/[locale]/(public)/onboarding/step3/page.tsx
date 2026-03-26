import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { Step3Client } from './_components/Step3Client';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

export const generateStaticParams = generateLocaleStaticParams;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'onboarding/step3' }),
    title: t('pageTitle', { step: 3 }),
  };
}

export default async function Step3Page(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <Step3Client locale={locale} />;
}
