'use client';

import { useCallback } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { OnboardingStepLayout, PeekModeStep } from '../_components';

export default function Step2Page() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { preferences, updatePreferences } = useGamePreferences();

  const handleSelectMode = useCallback(
    (mode: typeof preferences.peekMode) => {
      updatePreferences({ peekMode: mode });
    },
    [updatePreferences]
  );

  const handleNext = useCallback(() => {
    router.push(`/${locale}/onboarding/step3`);
  }, [router, locale]);

  const handleBack = useCallback(() => {
    router.push(`/${locale}/onboarding/step1`);
  }, [router, locale]);

  const handleSkip = useCallback(() => {
    router.push(`/${locale}/play`);
  }, [router, locale]);

  return (
    <OnboardingStepLayout
      currentStepIndex={1}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
    >
      <PeekModeStep selectedMode={preferences.peekMode} onSelectMode={handleSelectMode} />
    </OnboardingStepLayout>
  );
}
