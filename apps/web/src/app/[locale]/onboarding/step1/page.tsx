'use client';

import { useCallback } from 'react';

import { useParams, useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { MoveInputStep, OnboardingStepLayout } from '../_components';

type MoveInputMode = GamePreferences['moveInputMode'];

export default function Step1Page() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { preferences, updatePreferences } = useGamePreferences();

  const handleToggleMode = useCallback(
    (mode: MoveInputMode) => {
      const current = preferences.enabledMoveInputModes;
      let newModes: MoveInputMode[];
      if (current.includes(mode)) {
        if (current.length <= 1) return;
        newModes = current.filter((m) => m !== mode);
      } else {
        newModes = [...current, mode];
      }
      updatePreferences({
        enabledMoveInputModes: newModes,
        moveInputMode: newModes[0],
      });
    },
    [preferences.enabledMoveInputModes, updatePreferences]
  );

  const handleNext = useCallback(() => {
    router.push(`/${locale}/onboarding/step2`);
  }, [router, locale]);

  const handleSkip = useCallback(() => {
    router.push(`/${locale}/play`);
  }, [router, locale]);

  return (
    <OnboardingStepLayout currentStepIndex={0} onNext={handleNext} onSkip={handleSkip}>
      <MoveInputStep
        selectedModes={preferences.enabledMoveInputModes}
        onToggleMode={handleToggleMode}
      />
    </OnboardingStepLayout>
  );
}
