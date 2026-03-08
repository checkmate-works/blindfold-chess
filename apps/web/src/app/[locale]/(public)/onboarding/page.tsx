import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';

import { generateCanonicalMetadata } from '@/app/[locale]/_lib/metadata';

/**
 * Onboarding (オンボーディング)
 *
 * @description Guides new users through initial setup of key preferences
 * before their first game. Each step is a separate route page under
 * /onboarding/step1, /onboarding/step2, /onboarding/step3.
 *
 * @flow
 * 1. STEP1: Choose Move Input Method (text / select / button)
 * 2. STEP2: Board Peek Mode
 * 3. STEP3: Piece Visibility / Appearance
 * 4. Complete -> navigate to /games/play
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
  redirect(`/${locale}/onboarding/step1`);
}
