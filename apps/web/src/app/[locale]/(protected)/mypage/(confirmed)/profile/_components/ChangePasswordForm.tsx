'use client';

import { useState } from 'react';

import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getPasswordValidationError, parsePasswordServerError } from '@/lib/validations/password';

import { FormErrorMessage } from '@/app/[locale]/_components/FormErrorMessage';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { changePassword } from '../_actions/changePassword';

export function ChangePasswordForm() {
  const t = useTranslations('profile.changePassword');
  const tPassword = useTranslations('validation.password');
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      setError(tPassword(passwordError, { minLength: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (currentPassword === newPassword) {
      setError(t('passwordSameAsCurrent'));
      return;
    }

    setIsLoading(true);

    try {
      const changeResult = await changePassword(currentPassword, newPassword);

      if ('error' in changeResult) {
        const passwordErrorKey = parsePasswordServerError(changeResult.error);
        if (passwordErrorKey) {
          setError(tPassword(passwordErrorKey, { minLength: MIN_PASSWORD_LENGTH }));
        } else {
          switch (changeResult.error) {
            case 'currentPasswordIncorrect':
              setError(t('currentPasswordIncorrect'));
              break;
            case 'passwordSameAsCurrent':
              setError(t('passwordSameAsCurrent'));
              break;
            case 'rateLimited':
              setError(t('rateLimited'));
              break;
            default:
              setError(t('error'));
          }
        }
        setIsLoading(false);
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast(t('success'), 'success');
    } catch {
      setError(t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <FormErrorMessage message={error} />}

        <AuthField
          id="currentPassword"
          type="password"
          label={t('currentPasswordLabel')}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
        />

        <AuthField
          id="newPassword"
          type="password"
          label={t('newPasswordLabel')}
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
        />

        <AuthField
          id="confirmNewPassword"
          type="password"
          label={t('confirmPasswordLabel')}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
        />

        <AuthSubmitButton
          isLoading={isLoading}
          idleLabel={t('submit')}
          loadingLabel={t('submitLoading')}
        />
      </form>
    </section>
  );
}
