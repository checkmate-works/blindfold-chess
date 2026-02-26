'use client';

import { useCallback, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { OnboardingStepLayout, PieceSettingsStep } from '../_components';

type PieceShapeMode = GamePreferences['pieceShapeMode'];
type PieceColors = GamePreferences['pieceColors'];

export default function Step3Page() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { updatePreferences } = useGamePreferences();
  const [showOwnPieces, setShowOwnPieces] = useState(true);
  const [showOpponentPieces, setShowOpponentPieces] = useState(true);
  const [selectedPieceShape, setSelectedPieceShape] = useState<PieceShapeMode>('normal');
  const [selectedPieceColors, setSelectedPieceColors] = useState<PieceColors>('normal');

  const handleFinish = useCallback(() => {
    updatePreferences({
      showOwnPieces,
      showOpponentPieces,
      pieceShapeMode: selectedPieceShape,
      pieceColors: selectedPieceColors,
    });
    router.push(`/${locale}/play`);
  }, [
    updatePreferences,
    showOwnPieces,
    showOpponentPieces,
    selectedPieceShape,
    selectedPieceColors,
    router,
    locale,
  ]);

  const handleBack = useCallback(() => {
    router.push(`/${locale}/onboarding/step2`);
  }, [router, locale]);

  const handleSkip = useCallback(() => {
    router.push(`/${locale}/play`);
  }, [router, locale]);

  return (
    <OnboardingStepLayout
      currentStepIndex={2}
      isLastStep
      onNext={handleFinish}
      onBack={handleBack}
      onSkip={handleSkip}
    >
      <PieceSettingsStep
        showOwnPieces={showOwnPieces}
        onChangeShowOwnPieces={setShowOwnPieces}
        showOpponentPieces={showOpponentPieces}
        onChangeShowOpponentPieces={setShowOpponentPieces}
        selectedPieceShape={selectedPieceShape}
        onSelectPieceShape={setSelectedPieceShape}
        selectedPieceColors={selectedPieceColors}
        onSelectPieceColors={setSelectedPieceColors}
      />
    </OnboardingStepLayout>
  );
}
