'use client';

import { useTranslations } from 'next-intl';

import { StepIndicator } from './StepIndicator';

const STEPS = [
  { id: 'move-input', labelKey: 'step1.shortLabel' },
  { id: 'peek-mode', labelKey: 'step2.shortLabel' },
  { id: 'piece-settings', labelKey: 'step3.shortLabel' },
];

type Props = {
  currentStepIndex: number;
  isLastStep?: boolean;
  onNext: () => void;
  onBack?: () => void;
  onSkip: () => void;
  children: React.ReactNode;
};

export function OnboardingStepLayout({
  currentStepIndex,
  isLastStep = false,
  onNext,
  onBack,
  onSkip,
  children,
}: Props) {
  const t = useTranslations('onboarding');

  const steps = STEPS.map((step) => ({
    id: step.id,
    label: t(step.labelKey),
  }));

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <StepIndicator steps={steps} currentStepIndex={currentStepIndex} />

      <div className="bg-card border border-border rounded-lg p-6">{children}</div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('skip')}
        </button>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
            >
              {t('back')}
            </button>
          )}

          <button
            type="button"
            onClick={onNext}
            className="px-6 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            {isLastStep ? t('finish') : t('next')}
          </button>
        </div>
      </div>
    </div>
  );
}
