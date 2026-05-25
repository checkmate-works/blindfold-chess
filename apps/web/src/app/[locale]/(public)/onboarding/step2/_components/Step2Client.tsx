'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BOARD_VISIBILITY_VALUES, type BoardVisibility } from '@/lib/games/board-visibility';
import { BOARD_VISIBILITY_ICON } from '@/lib/games/board-visibility-icons';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OnboardingStepLayout, PeekModeStep } from '../../_components';

type Props = {
  locale: Locale;
};

export function Step2Client({ locale }: Props) {
  const router = useRouter();
  const { preferences, updatePreferences } = useGamePreferences();
  const t = useTranslations('onboarding');

  const handleSelectVisibility = useCallback(
    (value: BoardVisibility) => {
      updatePreferences({ boardVisibility: value });
    },
    [updatePreferences]
  );

  const handleSelectPeekMode = useCallback(
    (mode: GamePreferences['peekMode']) => {
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
    router.push(`/${locale}/games/new`);
  }, [router, locale]);

  return (
    <OnboardingStepLayout
      currentStepIndex={1}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
    >
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{t('step2.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('step2.description')}</p>
        </div>

        {/* Board Visibility — primary 3-way choice. The blindfold experience
            is provided by the piece-display settings (step 3) even when the
            board is visible, so 'always' is a valid choice for players who
            want to see piece placement but not the piece types/colors. */}
        <div className="space-y-2">
          {BOARD_VISIBILITY_VALUES.map((value) => {
            const isSelected = preferences.boardVisibility === value;
            const Icon = BOARD_VISIBILITY_ICON[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleSelectVisibility(value)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:bg-accent'
                }`}
              >
                <div
                  className={`flex-shrink-0 text-2xl ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <Icon />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {t(`step2.boardVisibilities.${value}.label`)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t(`step2.boardVisibilities.${value}.description`)}
                  </p>
                </div>
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
                    isSelected ? 'border-primary' : 'border-border'
                  }`}
                >
                  {isSelected && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Secondary picker — only relevant when the player chose 'peek'.
            The modal/inline distinction has no effect under 'always' (board
            is permanently shown) or 'never' (no board surfaced). */}
        {preferences.boardVisibility === 'peek' && (
          <>
            <div className="border-t border-border" />
            <PeekModeStep selectedMode={preferences.peekMode} onSelectMode={handleSelectPeekMode} />
          </>
        )}
      </div>
    </OnboardingStepLayout>
  );
}
