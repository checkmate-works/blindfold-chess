'use client';

import { Button, TextInput, Textarea } from '@/app/_components';
import { CountrySelect } from '@/app/_components/CountrySelect';

import { BIO_MAX_LENGTH, DISPLAY_NAME_MAX_LENGTH } from '@/lib/users/profile-limits';

import { useProfileForm } from '../_hooks/useProfileForm';
import type { ProfileFormProps } from '../_lib/profile-form-types';
import { AvatarUpload } from './AvatarUpload';
import { FlairPicker } from './FlairPicker';
import { FormField } from './profile-form/FormField';

export function ProfileForm({ locale, profile }: ProfileFormProps) {
  const { t, fields, setField, error, isSubmitting, handleSubmit } = useProfileForm(profile);

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
            maxLength={DISPLAY_NAME_MAX_LENGTH}
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
            maxLength={BIO_MAX_LENGTH}
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
