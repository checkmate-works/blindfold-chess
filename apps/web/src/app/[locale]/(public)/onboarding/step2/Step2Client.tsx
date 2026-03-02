'use client';

import { useCallback } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { PreferenceOption } from '@/app/[locale]/(public)/preferences/_components/PreferenceOption';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { OnboardingStepLayout, PeekModeStep } from '../_components';

type Props = {
  locale: Locale;
};

export function Step2Client({ locale }: Props) {
  const router = useRouter();
  const { preferences, updatePreferences } = useGamePreferences();
  const t = useTranslations('onboarding');

  const handleSelectMode = useCallback(
    (mode: typeof preferences.peekMode) => {
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

        <PreferenceOption
          type="checkbox"
          checked={preferences.showBoardButtonInGame}
          onChange={(e) => updatePreferences({ showBoardButtonInGame: e.target.checked })}
          label={t('step2.showBoardButton')}
        />

        {preferences.showBoardButtonInGame && (
          <>
            <div className="border-t border-border" />
            <PeekModeStep selectedMode={preferences.peekMode} onSelectMode={handleSelectMode} />
          </>
        )}
      </div>
    </OnboardingStepLayout>
  );
}
