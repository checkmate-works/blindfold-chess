'use client';

import { useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { MoveInputStep } from './MoveInputStep';
import { PeekModeStep } from './PeekModeStep';
import { PieceSettingsStep } from './PieceSettingsStep';
import { StepIndicator } from './StepIndicator';

type MoveInputMode = GamePreferences['moveInputMode'];
type PeekMode = GamePreferences['peekMode'];
type PieceShapeMode = GamePreferences['pieceShapeMode'];
type PieceColors = GamePreferences['pieceColors'];

type StepDefinition = {
  id: string;
  labelKey: string;
};

const STEPS: StepDefinition[] = [
  { id: 'move-input', labelKey: 'step1.shortLabel' },
  { id: 'peek-mode', labelKey: 'step2.shortLabel' },
  { id: 'piece-settings', labelKey: 'step3.shortLabel' },
];

type Props = {
  locale: string;
};

export function OnboardingClient({ locale }: Props) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const { updatePreferences } = useGamePreferences();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedModes, setSelectedModes] = useState<MoveInputMode[]>(['button']);
  const [selectedPeekMode, setSelectedPeekMode] = useState<PeekMode>('modal');
  const [showOwnPieces, setShowOwnPieces] = useState(true);
  const [showOpponentPieces, setShowOpponentPieces] = useState(true);
  const [selectedPieceShape, setSelectedPieceShape] = useState<PieceShapeMode>('normal');
  const [selectedPieceColors, setSelectedPieceColors] = useState<PieceColors>('normal');

  const handleToggleMode = useCallback((mode: MoveInputMode) => {
    setSelectedModes((prev) => {
      if (prev.includes(mode)) {
        // Don't allow deselecting the last remaining mode
        if (prev.length <= 1) return prev;
        return prev.filter((m) => m !== mode);
      }
      return [...prev, mode];
    });
  }, []);

  const steps = STEPS.map((step) => ({
    id: step.id,
    label: t(step.labelKey),
  }));

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const saveCurrentStepPreferences = useCallback(() => {
    const step = STEPS[currentStepIndex];
    if (step.id === 'move-input') {
      updatePreferences({
        enabledMoveInputModes: selectedModes,
        moveInputMode: selectedModes[0],
      });
    } else if (step.id === 'peek-mode') {
      updatePreferences({ peekMode: selectedPeekMode });
    } else if (step.id === 'piece-settings') {
      updatePreferences({
        showOwnPieces,
        showOpponentPieces,
        pieceShapeMode: selectedPieceShape,
        pieceColors: selectedPieceColors,
      });
    }
  }, [
    currentStepIndex,
    selectedModes,
    selectedPeekMode,
    showOwnPieces,
    showOpponentPieces,
    selectedPieceShape,
    selectedPieceColors,
    updatePreferences,
  ]);

  const handleNext = useCallback(() => {
    saveCurrentStepPreferences();
    if (isLastStep) {
      router.push(`/${locale}/play`);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [saveCurrentStepPreferences, isLastStep, router, locale]);

  const handleBack = useCallback(() => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [isFirstStep]);

  const handleSkip = useCallback(() => {
    router.push(`/${locale}/play`);
  }, [router, locale]);

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <StepIndicator steps={steps} currentStepIndex={currentStepIndex} />

      <div className="bg-card border border-border rounded-lg p-6">
        {STEPS[currentStepIndex].id === 'move-input' && (
          <MoveInputStep selectedModes={selectedModes} onToggleMode={handleToggleMode} />
        )}
        {STEPS[currentStepIndex].id === 'peek-mode' && (
          <PeekModeStep selectedMode={selectedPeekMode} onSelectMode={setSelectedPeekMode} />
        )}
        {STEPS[currentStepIndex].id === 'piece-settings' && (
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
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('skip')}
        </button>

        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <button
              type="button"
              onClick={handleBack}
              className="px-6 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
            >
              {t('back')}
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            {isLastStep ? t('finish') : t('next')}
          </button>
        </div>
      </div>
    </div>
  );
}
