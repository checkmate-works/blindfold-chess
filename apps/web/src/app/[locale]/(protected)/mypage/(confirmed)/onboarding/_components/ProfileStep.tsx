'use client';

import { Textarea } from '@/app/_components';
import { CountrySelect } from '@/app/_components/CountrySelect';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { AvatarUpload } from '@/app/[locale]/(protected)/mypage/(confirmed)/profile/_components/AvatarUpload';

type Props = {
  locale: string;
  currentAvatarUrl: string | null;
  country: string;
  onCountryChange: (code: string) => void;
  bio: string;
  onBioChange: (value: string) => void;
};

/**
 * Step 1 — profile. Nudges the user to set the two fields most often left
 * blank in production (avatar + country) plus an optional bio. The avatar
 * self-saves on upload; country/bio are persisted by the wizard when it
 * advances past this step.
 */
export function ProfileStep({
  locale,
  currentAvatarUrl,
  country,
  onCountryChange,
  bio,
  onBioChange,
}: Props) {
  const t = useTranslations('onboardingProfile');
  const tProfile = useTranslations('profile');

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="font-medium text-foreground">{t('completed')}</p>
        <p className="text-sm text-muted-foreground">{t('prompt')}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">{t('avatarLabel')}</label>
        <AvatarUpload currentAvatarUrl={currentAvatarUrl} />
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
          maxLength={500}
          rows={4}
        />
      </div>
    </div>
  );
}
