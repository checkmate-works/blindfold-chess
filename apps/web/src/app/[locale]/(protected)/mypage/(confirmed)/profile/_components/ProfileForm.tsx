'use client';

import { FormEvent, useReducer, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, TextInput, Textarea } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import type { Profile } from '@/lib/db';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import {
  type ProfileFields,
  SERVER_ERROR_MAP,
  validateProfileFields,
} from '../_lib/profile-validation';
import { AvatarUpload } from './AvatarUpload';
import { CountrySelect } from './CountrySelect';
import { FlairPicker } from './FlairPicker';

type FieldAction =
  | { type: 'SET_FIELD'; field: keyof ProfileFields; value: string }
  | { type: 'RESET'; payload: ProfileFields };

function fieldsReducer(state: ProfileFields, action: FieldAction): ProfileFields {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return action.payload;
  }
}

function initFields(profile: Profile): ProfileFields {
  return {
    displayName: profile.displayName ?? '',
    bio: profile.bio ?? '',
    country: profile.country ?? '',
    flair: profile.flair ?? '',
    fideId: profile.fideId ?? '',
    chesscomUsername: profile.chesscomUsername ?? '',
    lichessUsername: profile.lichessUsername ?? '',
    xUsername: profile.xUsername ?? '',
    instagramUsername: profile.instagramUsername ?? '',
    youtubeHandle: profile.youtubeHandle ?? '',
  };
}

type FormFieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error: { message: string; field?: string } | null;
  fieldName: string;
  hint?: string;
  children: React.ReactNode;
};

function FormField({ id, label, required, error, fieldName, hint, children }: FormFieldProps) {
  const labelClassName = 'block text-sm font-medium text-foreground mb-1';
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
      {error?.field === fieldName && (
        <p className="mt-2 text-sm text-destructive">{error.message}</p>
      )}
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type Props = {
  locale: string;
  profile: Profile;
};

export function ProfileForm({ locale, profile }: Props) {
  const t = useTranslations('profile');
  const router = useRouter();
  const { showToast } = useToast();
  const [fields, dispatch] = useReducer(fieldsReducer, profile, initFields);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = (field: keyof ProfileFields) => (value: string) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationError = validateProfileFields(fields);
    if (validationError) {
      setError({ message: t(validationError.messageKey), field: validationError.field });
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: fields.displayName.trim(),
          bio: fields.bio.trim() || undefined,
          country: fields.country || undefined,
          flair: fields.flair || undefined,
          fideId: fields.fideId.trim() || undefined,
          chesscomUsername: fields.chesscomUsername.trim() || undefined,
          lichessUsername: fields.lichessUsername.trim() || undefined,
          xUsername: fields.xUsername.trim() || undefined,
          instagramUsername: fields.instagramUsername.trim() || undefined,
          youtubeHandle: fields.youtubeHandle.trim() || undefined,
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
        <FormField
          id="displayName"
          label={t('displayNameLabel')}
          required
          error={error}
          fieldName="displayName"
          hint={t('displayNameMaxLength')}
        >
          <TextInput
            id="displayName"
            value={fields.displayName}
            onChange={(e) => setField('displayName')(e.target.value)}
            maxLength={50}
            autoComplete="off"
          />
        </FormField>

        <div>
          <label htmlFor="bio" className={labelClassName}>
            {t('bioLabel')}
          </label>
          <Textarea
            id="bio"
            value={fields.bio}
            onChange={(e) => setField('bio')(e.target.value)}
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
            value={fields.country}
            onChange={setField('country')}
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
            value={fields.flair}
            onChange={setField('flair')}
            placeholder={t('flairPlaceholder')}
            clearLabel={t('flairClear')}
          />
        </div>
      </section>

      {/* Chess Accounts Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('chessAccounts')}</h2>

        <FormField id="fideId" label={t('fideIdLabel')} error={error} fieldName="fideId">
          <TextInput
            id="fideId"
            value={fields.fideId}
            onChange={(e) => setField('fideId')(e.target.value)}
            placeholder={t('fideIdPlaceholder')}
            maxLength={50}
            autoComplete="off"
          />
        </FormField>

        <FormField
          id="chesscomUsername"
          label={t('chesscomUsernameLabel')}
          error={error}
          fieldName="chesscomUsername"
        >
          <TextInput
            id="chesscomUsername"
            value={fields.chesscomUsername}
            onChange={(e) => setField('chesscomUsername')(e.target.value)}
            placeholder={t('chesscomUsernamePlaceholder')}
            maxLength={255}
            autoComplete="off"
          />
        </FormField>

        <FormField
          id="lichessUsername"
          label={t('lichessUsernameLabel')}
          error={error}
          fieldName="lichessUsername"
        >
          <TextInput
            id="lichessUsername"
            value={fields.lichessUsername}
            onChange={(e) => setField('lichessUsername')(e.target.value)}
            placeholder={t('lichessUsernamePlaceholder')}
            maxLength={255}
            autoComplete="off"
          />
        </FormField>
      </section>

      {/* Social Media Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">{t('socialAccounts')}</h2>

        <FormField id="xUsername" label={t('xUsernameLabel')} error={error} fieldName="xUsername">
          <TextInput
            id="xUsername"
            value={fields.xUsername}
            onChange={(e) => setField('xUsername')(e.target.value)}
            placeholder={t('xUsernamePlaceholder')}
            maxLength={15}
            autoComplete="off"
          />
        </FormField>

        <FormField
          id="instagramUsername"
          label={t('instagramUsernameLabel')}
          error={error}
          fieldName="instagramUsername"
        >
          <TextInput
            id="instagramUsername"
            value={fields.instagramUsername}
            onChange={(e) => setField('instagramUsername')(e.target.value)}
            placeholder={t('instagramUsernamePlaceholder')}
            maxLength={30}
            autoComplete="off"
          />
        </FormField>

        <FormField
          id="youtubeHandle"
          label={t('youtubeHandleLabel')}
          error={error}
          fieldName="youtubeHandle"
        >
          <TextInput
            id="youtubeHandle"
            value={fields.youtubeHandle}
            onChange={(e) => setField('youtubeHandle')(e.target.value)}
            placeholder={t('youtubeHandlePlaceholder')}
            maxLength={30}
            autoComplete="off"
          />
        </FormField>
      </section>

      {error && !error.field && <p className="text-sm text-destructive">{error.message}</p>}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isSubmitting}
        disabled={fields.displayName.trim().length === 0}
      >
        {t('submit')}
      </Button>
    </form>
  );
}
