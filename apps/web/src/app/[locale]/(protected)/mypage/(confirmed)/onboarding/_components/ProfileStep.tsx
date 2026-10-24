'use client';

import { Textarea } from '@/app/_components';
import { CountrySelect } from '@/app/_components/CountrySelect';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { BIO_MAX_LENGTH } from '@/lib/users/profile-limits';

import { AvatarUpload } from '@/app/[locale]/(protected)/mypage/(confirmed)/profile/_components/AvatarUpload';
import { TEXT_LINK_CLASSES } from '@/app/[locale]/_lib/link-classes';

type Props = {
  locale: string;
  currentAvatarUrl: string | null;
  onAvatarChange: (avatarUrl: string | null) => void;
  country: string;
  onCountryChange: (code: string) => void;
  bio: string;
  onBioChange: (value: string) => void;
  /** Leave the step without saving — the same action as the wizard's bottom link. */
  onSkip: () => void;
};

/**
 * Step 1 — profile. Nudges the user to set the two fields most often left
 * blank in production (avatar + country) plus an optional bio. The avatar
 * self-saves on upload; country/bio are persisted by the wizard when it
 * advances past this step.
 *
 * The way out sits right under the prompt, not only below the form. A
 * "(optional)" suffix on the prompt was not enough: production profiles
 * filled with throwaway values suggested members took the form as a required
 * step. An exit placed before the fields says the step is optional by
 * offering it, and "set up later" says nothing is lost by taking it.
 */
export function ProfileStep({
  locale,
  currentAvatarUrl,
  onAvatarChange,
  country,
  onCountryChange,
  bio,
  onBioChange,
  onSkip,
}: Props) {
  const t = useTranslations('onboardingProfile');
  const tWizard = useTranslations('onboardingWizard');
  const tProfile = useTranslations('profile');

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{t('prompt')}</p>
        <button type="button" onClick={onSkip} className={`text-sm ${TEXT_LINK_CLASSES}`}>
          {tWizard('nav.skip')}
        </button>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">{t('avatarLabel')}</label>
        <AvatarUpload currentAvatarUrl={currentAvatarUrl} onAvatarChange={onAvatarChange} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t('countryLabel')}
        </label>
        <CountrySelect
          value={country}
          onChange={onCountryChange}
          locale={locale}
          placeholder={tProfile('countryPlaceholder')}
          searchPlaceholder={tProfile('countrySearch')}
          clearLabel={tProfile('countryClear')}
          noResults={tProfile('noCountryResults')}
        />
      </div>

      <div>
        <label htmlFor="bio" className="mb-1 block text-sm font-medium text-foreground">
          {tProfile('bioLabel')}
        </label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          placeholder={tProfile('bioPlaceholder')}
          maxLength={BIO_MAX_LENGTH}
          rows={4}
        />
      </div>
    </div>
  );
}
