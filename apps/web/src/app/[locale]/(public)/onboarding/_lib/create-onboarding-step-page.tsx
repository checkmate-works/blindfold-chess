import type { ComponentType } from 'react';

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { generateCanonicalMetadata, resolveTitle } from '@/app/[locale]/_lib/metadata';
import { generateLocaleStaticParams } from '@/app/[locale]/_lib/static-params';
import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  params: Promise<{
    locale: Locale;
  }>;
};

type CreateOnboardingStepPageConfig = {
  step: number;
  Client: ComponentType<{ locale: Locale }>;
};

/**
 * Builds the `page.tsx` exports for an onboarding step. Every step page is
 * identical apart from its step number (used in the title + canonical path)
 * and its step-specific client component, so they share this factory.
 */
export function createOnboardingStepPage({ step, Client }: CreateOnboardingStepPageConfig) {
  const generateStaticParams = generateLocaleStaticParams;

  async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations({ locale, namespace: 'onboarding' });

    const title = t('pageTitle', { step });

    return {
      ...generateCanonicalMetadata({ locale, path: `onboarding/step${step}`, title }),
      title: resolveTitle(title, locale),
    };
  }

  async function Page(props: Props) {
    const { locale } = await props.params;
    setRequestLocale(locale);

    return <Client locale={locale} />;
  }

  return { generateStaticParams, generateMetadata, Page };
}
