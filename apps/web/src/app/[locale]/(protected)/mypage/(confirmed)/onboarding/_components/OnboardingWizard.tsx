'use client';

import { type ReactNode, useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { saveOnboardingProfile } from '../_actions/saveOnboardingProfile';
import { HelpTourStep } from './HelpTourStep';
import { ProfileStep } from './ProfileStep';
import { StepIndicator } from './StepIndicator';

type Props = {
  locale: string;
  currentAvatarUrl: string | null;
  currentCountry: string | null;
  currentBio: string | null;
  /**
   * Final slide, server-rendered and injected so it can reuse the
   * getting-started belt-ranks section (RSC) from this client wizard.
   */
  beltSlide: ReactNode;
};

const STEP_COUNT = 3;

/**
 * Post-registration onboarding wizard (一体型3ステップ).
 *
 * Step 1 collects optional profile fields (avatar self-saves; country/bio are
 * persisted by this wizard when it leaves step 1). Step 2 is the help-tour
 * explainer. Step 3 is the belt-ranks slide, which carries its own exit links
 * (すべての段級位を見る → /ranks, AIと対局する → /games/new) instead of the
 * shared nav. Step state is client-side; the URL does not change. Everything is
 * optional (skip on step 1) and there is no completion flag or layout guard.
 */
export function OnboardingWizard({
  locale,
  currentAvatarUrl,
  currentCountry,
  currentBio,
  beltSlide,
}: Props) {
  const t = useTranslations('onboardingWizard');

  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(currentCountry ?? '');
  const [bio, setBio] = useState(currentBio ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist the optional profile fields before leaving step 1. No-op when both
  // are blank. Returns false on failure so the caller can keep the user on the
  // step to retry.
  const persistProfile = async (): Promise<boolean> => {
    if (!country && !bio.trim()) {
      return true;
    }
    setIsSaving(true);
    setError(null);
    const result = await saveOnboardingProfile({ country, bio });
    setIsSaving(false);
    if (!result.ok) {
      setError(t('saveError'));
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 0 && !(await persistProfile())) {
      return;
    }
    setStep((s) => Math.min(STEP_COUNT - 1, s + 1));
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  // Skip from the profile step advances to step 2 without saving.
  const handleSkipProfile = () => {
    setStep(1);
  };

  const isLastStep = step === STEP_COUNT - 1;

  return (
    <div className="space-y-8">
      <StepIndicator count={STEP_COUNT} currentStepIndex={step} />

      {step === 0 && (
        <ProfileStep
          locale={locale}
          currentAvatarUrl={currentAvatarUrl}
          country={country}
          onCountryChange={setCountry}
          bio={bio}
          onBioChange={setBio}
        />
      )}
      {step === 1 && <HelpTourStep />}
      {step === 2 && beltSlide}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* The last slide (belt ranks) carries its own exit links, so the shared
          next/back nav is shown only on the earlier steps. */}
      {!isLastStep && (
        <div>
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleNext}
            loading={isSaving}
            disabled={isSaving}
          >
            {step === 0 ? t('nav.saveAndNext') : t('nav.next')}
          </Button>
          <button
            type="button"
            onClick={step === 0 ? handleSkipProfile : handleBack}
            disabled={isSaving}
            className="mt-6 block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {step === 0 ? t('nav.skip') : t('nav.back')}
          </button>
        </div>
      )}
    </div>
  );
}
