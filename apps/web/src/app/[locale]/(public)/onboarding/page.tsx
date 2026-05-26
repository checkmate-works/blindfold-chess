import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createPageMetadata } from '@/app/[locale]/_lib/metadata';
import type { LocalePageProps } from '@/app/[locale]/_lib/types';

/**
 * Onboarding
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

type Props = LocalePageProps;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createPageMetadata({ params, namespace: 'metadata.onboarding', path: 'onboarding' });
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/onboarding/step1`);
}
