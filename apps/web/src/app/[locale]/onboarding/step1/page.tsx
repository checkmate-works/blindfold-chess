'use client';

import { useCallback, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { MoveInputStep, OnboardingStepLayout } from '../_components';

type MoveInputMode = GamePreferences['moveInputMode'];

export default function Step1Page() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { updatePreferences } = useGamePreferences();
  const [selectedModes, setSelectedModes] = useState<MoveInputMode[]>(['button']);

  const handleToggleMode = useCallback((mode: MoveInputMode) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
  }, []);

  const handleNext = useCallback(() => {
    updatePreferences({
      enabledMoveInputModes: selectedModes,
      moveInputMode: selectedModes[0],
    });
    router.push(`/${locale}/onboarding/step2`);
  }, [updatePreferences, selectedModes, router, locale]);

  const handleSkip = useCallback(() => {
    router.push(`/${locale}/play`);
  }, [router, locale]);

  return (
    <OnboardingStepLayout currentStepIndex={0} onNext={handleNext} onSkip={handleSkip}>
      <MoveInputStep selectedModes={selectedModes} onToggleMode={handleToggleMode} />
    </OnboardingStepLayout>
  );
}
