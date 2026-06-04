'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, Textarea } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { AvatarUpload } from '@/app/[locale]/(protected)/mypage/(confirmed)/profile/_components/AvatarUpload';
import { CountrySelect } from '@/app/[locale]/(protected)/mypage/(confirmed)/profile/_components/CountrySelect';

import { saveOnboardingProfile } from '../_actions/saveOnboardingProfile';

type Props = {
  locale: string;
  currentAvatarUrl: string | null;
  currentCountry: string | null;
  currentBio: string | null;
};

export function OnboardingProfileForm({
  locale,
  currentAvatarUrl,
  currentCountry,
  currentBio,
}: Props) {
  const t = useTranslations('onboardingProfile');
  const tProfile = useTranslations('profile');
  const router = useRouter();
  const [country, setCountry] = useState(currentCountry ?? '');
  const [bio, setBio] = useState(currentBio ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToMypage = () => {
    router.push(`/${locale}/mypage`);
  };

  const handleSaveAndStart = async () => {
    // Avatar is already persisted on upload; only the (optional) country and
    // bio remain. Skip the round-trip when the user left both blank.
    if (!country && !bio.trim()) {
      goToMypage();
      return;
    }

    setIsSaving(true);
    setError(null);
    const result = await saveOnboardingProfile({ country, bio });
    if (!result.ok) {
      setError(t('saveError'));
      setIsSaving(false);
      return;
    }
    goToMypage();
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">{t('avatarLabel')}</label>
        <AvatarUpload currentAvatarUrl={currentAvatarUrl} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('countryLabel')}
        </label>
        <CountrySelect
          value={country}
          onChange={setCountry}
          locale={locale}
          placeholder={tProfile('countryPlaceholder')}
          searchPlaceholder={tProfile('countrySearch')}
          clearLabel={tProfile('countryClear')}
          noResults={tProfile('noCountryResults')}
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-foreground mb-1">
          {tProfile('bioLabel')}
        </label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={tProfile('bioPlaceholder')}
          maxLength={500}
          rows={4}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSaving}
          disabled={isSaving}
          onClick={handleSaveAndStart}
        >
          {t('saveAndStart')}
        </Button>
        <button
          type="button"
          onClick={goToMypage}
          disabled={isSaving}
          className="mt-6 block w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {t('skip')}
        </button>
      </div>
    </div>
  );
}
