'use client';

import { type ReactNode, useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { SocialAuthorProfile } from '@/lib/users/author-profile';

import { saveOnboardingProfile } from '../_actions/saveOnboardingProfile';
import { HelpTourStep } from './HelpTourStep';
import { type JoinAnnouncementAnswer, JoinAnnouncementStep } from './JoinAnnouncementStep';
import { ProfileStep } from './ProfileStep';
import { StepIndicator } from './StepIndicator';

type Props = {
  locale: string;
  /** The member as the feed would render them, before any edits on step 1. */
  member: SocialAuthorProfile;
  currentBio: string | null;
  /**
   * Whether the arrival-announcement step is still open for this member
   * (no `join_announcement_decisions` row). When it is not — already
   * answered, or a member who predates the feature — the step is left out.
   */
  canAnnounce: boolean;
  /**
   * Final slide, server-rendered and injected so it can reuse the
   * getting-started belt-ranks section (RSC) from this client wizard.
   */
  beltSlide: ReactNode;
};

type StepKey = 'profile' | 'joinAnnouncement' | 'helpTour' | 'belt';

/**
 * Post-registration onboarding wizard (一体型ウィザード).
 *
 * Steps: (1) optional profile fields (avatar self-saves; country/bio are
 * persisted by this wizard when it leaves step 1); (2) the arrival
 * announcement — a preview of the "〇〇 joined" home-feed card with post /
 * don't-post buttons, shown only while the question is open; (3) the
 * help-tour explainer; (4) the belt-ranks slide, which carries its own exit
 * links instead of the shared nav. Step state is client-side; the URL does
 * not change.
 *
 * The step list is fixed at mount from `canAnnounce`, so answering the
 * announcement does not renumber the steps under the member's feet; going
 * back to it shows the answer instead of the buttons.
 */
export function OnboardingWizard({ locale, member, currentBio, canAnnounce, beltSlide }: Props) {
  const t = useTranslations('onboardingWizard');

  const [steps] = useState<StepKey[]>(() =>
    canAnnounce
      ? ['profile', 'joinAnnouncement', 'helpTour', 'belt']
      : ['profile', 'helpTour', 'belt']
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState(member.avatarUrl);
  const [country, setCountry] = useState(member.country ?? '');
  // The country the feed card will actually show: what is stored, not what is
  // in the select. Skipping step 1 discards the select's value.
  const [savedCountry, setSavedCountry] = useState(member.country);
  const [bio, setBio] = useState(currentBio ?? '');
  const [announcement, setAnnouncement] = useState<JoinAnnouncementAnswer | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = steps[stepIndex];

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
    if ('error' in result) {
      setError(t('saveError'));
      return false;
    }
    setSavedCountry(country || null);
    return true;
  };

  const goNext = () => {
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  };

  const handleNext = async () => {
    if (step === 'profile' && !(await persistProfile())) {
      return;
    }
    goNext();
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  // Skip from the profile step advances without saving.
  const handleSkipProfile = () => {
    goNext();
  };

  // The announcement step answers with its own buttons, and the last slide
  // (belt ranks) carries its own exit links, so the shared next button is shown
  // only on the other steps.
  const showSharedNext = step === 'profile' || step === 'helpTour';

  return (
    <div className="space-y-8">
      <StepIndicator count={steps.length} currentStepIndex={stepIndex} />

      {step === 'profile' && (
        <ProfileStep
          locale={locale}
          currentAvatarUrl={avatarUrl}
          onAvatarChange={setAvatarUrl}
          country={country}
          onCountryChange={setCountry}
          bio={bio}
          onBioChange={setBio}
          onSkip={handleSkipProfile}
        />
      )}
      {step === 'joinAnnouncement' && (
        <JoinAnnouncementStep
          locale={locale}
          member={{ ...member, avatarUrl, country: savedCountry }}
          answer={announcement}
          onAnswered={setAnnouncement}
          onNext={goNext}
        />
      )}
      {step === 'helpTour' && <HelpTourStep />}
      {step === 'belt' && beltSlide}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {step !== 'belt' && (
        <div>
          {showSharedNext && (
            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleNext}
              loading={isSaving}
              disabled={isSaving}
            >
              {step === 'profile' ? t('nav.saveAndNext') : t('nav.next')}
            </Button>
          )}
          <button
            type="button"
            onClick={step === 'profile' ? handleSkipProfile : handleBack}
            disabled={isSaving}
            className="mt-6 block w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            {step === 'profile' ? t('nav.skip') : t('nav.back')}
          </button>
        </div>
      )}
    </div>
  );
}
