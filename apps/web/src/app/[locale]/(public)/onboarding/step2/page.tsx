import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { Step2Client } from './_components/Step2Client';

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
    ...generateCanonicalMetadata({ locale, path: 'onboarding/step2' }),
    title: t('pageTitle', { step: 2 }),
  };
}

export default async function Step2Page(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <Step2Client locale={locale} />;
}
