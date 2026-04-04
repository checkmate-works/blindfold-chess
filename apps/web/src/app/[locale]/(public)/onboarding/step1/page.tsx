import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

import { Step1Client } from './_components/Step1Client';

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

  const title = t('pageTitle', { step: 1 });

  return {
    ...generateCanonicalMetadata({ locale, path: 'onboarding/step1', title }),
    title,
  };
}

export default async function Step1Page(props: Props) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  return <Step1Client locale={locale} />;
}
