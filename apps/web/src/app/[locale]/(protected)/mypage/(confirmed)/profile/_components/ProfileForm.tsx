'use client';

import { FormEvent, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { TextInput, Textarea } from '@/app/_components';

import type { Profile } from '@/lib/db';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { AvatarUpload } from './AvatarUpload';
import { CountrySelect } from './CountrySelect';
import { FlairPicker } from './FlairPicker';

type Props = {
  locale: string;
  profile: Profile;
};

export function ProfileForm({ locale, profile }: Props) {
  const t = useTranslations('profile');
  const router = useRouter();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [country, setCountry] = useState(profile.country ?? '');
  const [flair, setFlair] = useState(profile.flair ?? '');
  const [fideId, setFideId] = useState(profile.fideId ?? '');
  const [chesscomUsername, setChesscomUsername] = useState(profile.chesscomUsername ?? '');
  const [lichessUsername, setLichessUsername] = useState(profile.lichessUsername ?? '');
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): { message: string; field?: string } | null => {
    if (!displayName.trim()) {
      return { message: t('displayNameRequired'), field: 'displayName' };
    }
    if (bio.length > 500) {
      return { message: t('bioMaxLength'), field: 'bio' };
    }
    if (country && !/^[A-Za-z]{2}$/.test(country)) {
      return { message: t('countryInvalid'), field: 'country' };
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim() || undefined,
          country: country || undefined,
          flair: flair || undefined,
          fideId: fideId.trim() || undefined,
          chesscomUsername: chesscomUsername.trim() || undefined,
          lichessUsername: lichessUsername.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        switch (data.error) {
          case 'display_name_required':
            setError({ message: t('displayNameRequired'), field: 'displayName' });
            break;
          case 'display_name_inappropriate':
            setError({ message: t('displayNameInappropriate'), field: 'displayName' });
            break;
          case 'bio_too_long':
            setError({ message: t('bioMaxLength'), field: 'bio' });
            break;
          case 'invalid_country':
            setError({ message: t('countryInvalid'), field: 'country' });
            break;
          default:
            setError({ message: t('error') });
        }
        setIsSubmitting(false);
        return;
      }

      showToast(t('profileUpdated'), 'success');
      router.refresh();
      setIsSubmitting(false);
    } catch {
      setError({ message: t('error') });
      setIsSubmitting(false);
    }
  };

  const labelClassName = 'block text-sm font-medium text-foreground mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Avatar */}
      <section className="flex justify-center">
        <AvatarUpload
          currentAvatarUrl={profile.avatarUrl}
          onUploaded={() => {
            // Avatar is saved independently; no additional form state needed
          }}
        />
      </section>

      {/* Identity Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('identity')}</h2>

        {/* Display name does not require uniqueness (same approach as X/Instagram).
           Username serves as the unique identifier. */}
        <div>
          <label htmlFor="displayName" className={labelClassName}>
            {t('displayNameLabel')} <span className="text-destructive">*</span>
          </label>
          <TextInput
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            autoComplete="off"
          />
          {error?.field === 'displayName' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t('displayNameMaxLength')}</p>
        </div>

        <div>
          <label htmlFor="bio" className={labelClassName}>
            {t('bioLabel')}
          </label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('bioPlaceholder')}
            maxLength={500}
            rows={4}
          />
          {error?.field === 'bio' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
        </div>

        <div>
          <label className={labelClassName}>{t('countryLabel')}</label>
          <CountrySelect
            value={country}
            onChange={setCountry}
            locale={locale}
            placeholder={t('countryPlaceholder')}
            searchPlaceholder={t('countrySearch')}
            clearLabel={t('countryClear')}
            noResults={t('noCountryResults')}
          />
          {error?.field === 'country' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
        </div>

        <div>
          <label className={labelClassName}>{t('flairLabel')}</label>
          <FlairPicker
            value={flair}
            onChange={setFlair}
            placeholder={t('flairPlaceholder')}
            clearLabel={t('flairClear')}
          />
        </div>
      </section>

      {/* Chess Accounts Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('chessAccounts')}</h2>

        <div>
          <label htmlFor="fideId" className={labelClassName}>
            {t('fideIdLabel')}
          </label>
          <TextInput
            id="fideId"
            value={fideId}
            onChange={(e) => setFideId(e.target.value)}
            placeholder={t('fideIdPlaceholder')}
            maxLength={50}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="chesscomUsername" className={labelClassName}>
            {t('chesscomUsernameLabel')}
          </label>
          <TextInput
            id="chesscomUsername"
            value={chesscomUsername}
            onChange={(e) => setChesscomUsername(e.target.value)}
            placeholder={t('chesscomUsernamePlaceholder')}
            maxLength={255}
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="lichessUsername" className={labelClassName}>
            {t('lichessUsernameLabel')}
          </label>
          <TextInput
            id="lichessUsername"
            value={lichessUsername}
            onChange={(e) => setLichessUsername(e.target.value)}
            placeholder={t('lichessUsernamePlaceholder')}
            maxLength={255}
            autoComplete="off"
          />
        </div>
      </section>

      {error && !error.field && <p className="text-sm text-destructive">{error.message}</p>}

      <button
        type="submit"
        disabled={isSubmitting || displayName.trim().length === 0}
        className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
