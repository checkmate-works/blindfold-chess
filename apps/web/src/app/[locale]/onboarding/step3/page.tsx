'use client';

import { useCallback } from 'react';

import { useParams, useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { OnboardingStepLayout, PieceSettingsStep } from '../_components';

type PieceShapeMode = GamePreferences['pieceShapeMode'];
type PieceColors = GamePreferences['pieceColors'];

export default function Step3Page() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { preferences, updatePreferences } = useGamePreferences();

  const handleNext = useCallback(() => {
    router.push(`/${locale}/onboarding/step4`);
  }, [router, locale]);

  const handleBack = useCallback(() => {
    router.push(`/${locale}/onboarding/step2`);
  }, [router, locale]);

  const handleSkip = useCallback(() => {
    router.push(`/${locale}/games/new`);
  }, [router, locale]);

  return (
    <OnboardingStepLayout
      currentStepIndex={2}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
    >
      <PieceSettingsStep
        showOwnPieces={preferences.showOwnPieces}
        onChangeShowOwnPieces={(checked: boolean) => updatePreferences({ showOwnPieces: checked })}
        showOpponentPieces={preferences.showOpponentPieces}
        onChangeShowOpponentPieces={(checked: boolean) =>
          updatePreferences({ showOpponentPieces: checked })
        }
        selectedPieceShape={preferences.pieceShapeMode}
        onSelectPieceShape={(shape: PieceShapeMode) => updatePreferences({ pieceShapeMode: shape })}
        selectedPieceColors={preferences.pieceColors}
        onSelectPieceColors={(colors: PieceColors) => updatePreferences({ pieceColors: colors })}
      />
    </OnboardingStepLayout>
  );
}
