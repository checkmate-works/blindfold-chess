import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { PageTitle } from '../_components/PageTitle';
import { generateCanonicalMetadata } from '../_lib/metadata';
import { OnboardingClient } from './_components';

/**
 * Onboarding (オンボーディング)
 *
 * @description Guides new users through initial setup of key preferences
 * before their first game. Steps are defined as an array so additional steps
 * (e.g., Board Peek Mode, Piece Visibility) can be added easily.
 *
 * @flow
 * 1. STEP1: Choose Move Input Method (text / select / button)
 * 2. (Future) STEP2: Board Peek Mode
 * 3. (Future) STEP3: Piece Visibility / Appearance
 * 4. (Future) Preview
 * 5. Complete -> navigate to /play
 */

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.onboarding' });

  return {
    ...generateCanonicalMetadata({ locale, path: 'onboarding' }),
    title: t('title'),
    description: t('description'),
  };
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  return (
    <>
      <PageTitle>{t('title')}</PageTitle>
      <OnboardingClient locale={locale} />
    </>
  );
}
