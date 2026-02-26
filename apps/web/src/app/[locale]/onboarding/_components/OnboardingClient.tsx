'use client';

import { useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { MoveInputStep } from './MoveInputStep';
import { StepIndicator } from './StepIndicator';

type MoveInputMode = GamePreferences['moveInputMode'];

type StepDefinition = {
  id: string;
  labelKey: string;
};

const STEPS: StepDefinition[] = [{ id: 'move-input', labelKey: 'step1.shortLabel' }];

type Props = {
  locale: string;
};

export function OnboardingClient({ locale }: Props) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const { updatePreferences } = useGamePreferences();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedModes, setSelectedModes] = useState<MoveInputMode[]>(['button']);

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
    }
  }, [currentStepIndex, selectedModes, updatePreferences]);

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
