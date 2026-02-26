'use client';

import { useCallback, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { OnboardingStepLayout, PeekModeStep } from '../_components';

type PeekMode = GamePreferences['peekMode'];

export default function Step2Page() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { updatePreferences } = useGamePreferences();
  const [selectedPeekMode, setSelectedPeekMode] = useState<PeekMode>('modal');

  const handleNext = useCallback(() => {
    updatePreferences({ peekMode: selectedPeekMode });
    router.push(`/${locale}/onboarding/step3`);
  }, [updatePreferences, selectedPeekMode, router, locale]);

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
      <PeekModeStep selectedMode={selectedPeekMode} onSelectMode={setSelectedPeekMode} />
    </OnboardingStepLayout>
  );
}
