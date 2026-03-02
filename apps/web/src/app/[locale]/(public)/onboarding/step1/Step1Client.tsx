'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { MoveInputStep, OnboardingStepLayout } from '../_components';

type MoveInputMode = GamePreferences['moveInputMode'];

type Props = {
  locale: Locale;
};

export function Step1Client({ locale }: Props) {
  const router = useRouter();
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
    router.push(`/${locale}/games/new`);
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
