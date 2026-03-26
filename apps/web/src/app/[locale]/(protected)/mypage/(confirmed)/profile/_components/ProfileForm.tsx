'use client';

import { FormEvent, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button, TextInput, Textarea } from '@/app/_components';

import type { Profile } from '@/lib/db';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { AvatarUpload } from './AvatarUpload';
import { CountrySelect } from './CountrySelect';
import { FlairPicker } from './FlairPicker';

const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;
const FIDE_ID_PATTERN = /^\d+$/;
const CHESS_USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const X_USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const INSTAGRAM_USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/;
const YOUTUBE_HANDLE_PATTERN = /^[a-zA-Z0-9._-]+$/;

const VALIDATION_RULES: { field: string; regex: RegExp; errorKey: string }[] = [
  { field: 'fideId', regex: FIDE_ID_PATTERN, errorKey: 'fideIdInvalidFormat' },
  {
    field: 'chesscomUsername',
    regex: CHESS_USERNAME_PATTERN,
    errorKey: 'chesscomUsernameInvalidFormat',
  },
  {
    field: 'lichessUsername',
    regex: CHESS_USERNAME_PATTERN,
    errorKey: 'lichessUsernameInvalidFormat',
  },
  { field: 'xUsername', regex: X_USERNAME_PATTERN, errorKey: 'xUsernameInvalidFormat' },
  {
    field: 'instagramUsername',
    regex: INSTAGRAM_USERNAME_PATTERN,
    errorKey: 'instagramUsernameInvalidFormat',
  },
  { field: 'youtubeHandle', regex: YOUTUBE_HANDLE_PATTERN, errorKey: 'youtubeHandleInvalidFormat' },
];

const SERVER_ERROR_MAP: Record<string, { messageKey: string; field: string }> = {
  display_name_required: { messageKey: 'displayNameRequired', field: 'displayName' },
  display_name_inappropriate: { messageKey: 'displayNameInappropriate', field: 'displayName' },
  bio_too_long: { messageKey: 'bioMaxLength', field: 'bio' },
  invalid_country: { messageKey: 'countryInvalid', field: 'country' },
  fide_id_invalid_format: { messageKey: 'fideIdInvalidFormat', field: 'fideId' },
  chesscom_username_invalid_format: {
    messageKey: 'chesscomUsernameInvalidFormat',
    field: 'chesscomUsername',
  },
  lichess_username_invalid_format: {
    messageKey: 'lichessUsernameInvalidFormat',
    field: 'lichessUsername',
  },
  x_username_invalid_format: { messageKey: 'xUsernameInvalidFormat', field: 'xUsername' },
  instagram_username_invalid_format: {
    messageKey: 'instagramUsernameInvalidFormat',
    field: 'instagramUsername',
  },
  youtube_handle_invalid_format: {
    messageKey: 'youtubeHandleInvalidFormat',
    field: 'youtubeHandle',
  },
};

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
  const [xUsername, setXUsername] = useState(profile.xUsername ?? '');
  const [instagramUsername, setInstagramUsername] = useState(profile.instagramUsername ?? '');
  const [youtubeHandle, setYoutubeHandle] = useState(profile.youtubeHandle ?? '');
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): { message: string; field?: string } | null => {
    if (!displayName.trim()) {
      return { message: t('displayNameRequired'), field: 'displayName' };
    }
    if (bio.length > 500) {
      return { message: t('bioMaxLength'), field: 'bio' };
    }
    if (country && !COUNTRY_CODE_PATTERN.test(country)) {
      return { message: t('countryInvalid'), field: 'country' };
    }

    const fieldValues: Record<string, string> = {
      fideId,
      chesscomUsername,
      lichessUsername,
      xUsername,
      instagramUsername,
      youtubeHandle,
    };

    for (const rule of VALIDATION_RULES) {
      const value = fieldValues[rule.field].trim();
      if (value && !rule.regex.test(value)) {
        return { message: t(rule.errorKey), field: rule.field };
      }
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
          xUsername: xUsername.trim() || undefined,
          instagramUsername: instagramUsername.trim() || undefined,
          youtubeHandle: youtubeHandle.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const mapped = SERVER_ERROR_MAP[data.error as string];
        if (mapped) {
          setError({ message: t(mapped.messageKey), field: mapped.field });
        } else {
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
        <AvatarUpload currentAvatarUrl={profile.avatarUrl} />
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
          {error?.field === 'fideId' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
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
          {error?.field === 'chesscomUsername' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
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
          {error?.field === 'lichessUsername' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
        </div>
      </section>

      {/* Social Media Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('socialAccounts')}</h2>

        <div>
          <label htmlFor="xUsername" className={labelClassName}>
            {t('xUsernameLabel')}
          </label>
          <TextInput
            id="xUsername"
            value={xUsername}
            onChange={(e) => setXUsername(e.target.value)}
            placeholder={t('xUsernamePlaceholder')}
            maxLength={15}
            autoComplete="off"
          />
          {error?.field === 'xUsername' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="instagramUsername" className={labelClassName}>
            {t('instagramUsernameLabel')}
          </label>
          <TextInput
            id="instagramUsername"
            value={instagramUsername}
            onChange={(e) => setInstagramUsername(e.target.value)}
            placeholder={t('instagramUsernamePlaceholder')}
            maxLength={30}
            autoComplete="off"
          />
          {error?.field === 'instagramUsername' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="youtubeHandle" className={labelClassName}>
            {t('youtubeHandleLabel')}
          </label>
          <TextInput
            id="youtubeHandle"
            value={youtubeHandle}
            onChange={(e) => setYoutubeHandle(e.target.value)}
            placeholder={t('youtubeHandlePlaceholder')}
            maxLength={30}
            autoComplete="off"
          />
          {error?.field === 'youtubeHandle' && (
            <p className="mt-2 text-sm text-destructive">{error.message}</p>
          )}
        </div>
      </section>

      {error && !error.field && <p className="text-sm text-destructive">{error.message}</p>}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isSubmitting}
        disabled={displayName.trim().length === 0}
      >
        {t('submit')}
      </Button>
    </form>
  );
}
