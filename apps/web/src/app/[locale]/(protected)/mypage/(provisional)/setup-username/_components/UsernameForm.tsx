'use client';

import { FormEvent, useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button, TextInput } from '@/app/_components';

import { validateUsername } from '@/lib/username';

type Props = {
  locale: string;
};

export function UsernameForm({ locale }: Props) {
  const t = useTranslations('setupUsername');
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getValidationMessage = useCallback(
    (errorKey: string): string => {
      switch (errorKey) {
        case 'too_short':
          return t('validation.tooShort');
        case 'too_long':
          return t('validation.tooLong');
        case 'invalid_format':
          return t('validation.invalidFormat');
        case 'reserved':
          return t('validation.reserved');
        case 'username_taken':
          return t('validation.taken');
        case 'username_already_set':
          return t('validation.alreadySet');
        case 'username_inappropriate':
          return t('validation.usernameInappropriate');
        case 'display_name_inappropriate':
          return t('validation.displayNameInappropriate');
        default:
          return t('validation.error');
      }
    },
    [t]
  );

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (error) {
      setError(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const validationError = validateUsername(trimmedUsername);
    if (validationError) {
      setError(getValidationMessage(validationError));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          displayName: displayName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(getValidationMessage(data.error));
        setIsSubmitting(false);
        return;
      }

      router.push(`/${locale}/mypage`);
    } catch {
      setError(getValidationMessage('unknown'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1">
          {t('usernameLabel')} <span className="text-destructive">*</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">{t('usernameDescription')}</p>
        <TextInput
          id="username"
          value={username}
          onChange={(e) => handleUsernameChange(e.target.value)}
          placeholder={t('usernamePlaceholder')}
          maxLength={20}
          autoFocus
          autoComplete="off"
        />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <ul className="mt-2 list-disc list-inside space-y-0.5">
          <li className="text-xs text-destructive">{t('cannotChange')}</li>
          <li className="text-xs text-muted-foreground">{t('inappropriateWarning')}</li>
          <li className="text-xs text-muted-foreground">{t('usernameHint')}</li>
        </ul>
      </div>

      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-foreground mb-1">
          {t('displayNameLabel')}
        </label>
        <p className="text-xs text-muted-foreground mb-2">{t('displayNameDescription')}</p>
        <TextInput
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t('displayNamePlaceholder')}
          maxLength={50}
          autoComplete="off"
        />
        <ul className="mt-2 list-disc list-inside">
          <li className="text-xs text-muted-foreground">{t('displayNameCanChange')}</li>
          <li className="text-xs text-muted-foreground">{t('displayNameMaxLength')}</li>
        </ul>
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-accent"
        />
        <span className="text-sm text-muted-foreground">
          {t('agreeToTermsPrefix')}
          <a
            href={`/${locale}/terms`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {t('termsLink')}
          </a>
          {t('agreeToTermsSuffix')}
        </span>
      </label>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        shadow={false}
        disabled={isSubmitting || username.trim().length === 0 || !agreedToTerms}
        loading={isSubmitting}
      >
        {isSubmitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
