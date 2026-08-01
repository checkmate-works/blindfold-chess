'use client';

import { useState } from 'react';

import { useSubmitError } from '@/_hooks/useSubmitError';
import { AuthField, AuthSubmitButton } from '@/app/_components/AuthFormFields';
import { FormErrorBanner } from '@/app/_components/FormErrorBanner';
import { MIN_PASSWORD_LENGTH } from '@/config';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { getPasswordValidationError, parsePasswordServerError } from '@/lib/validations/password';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { changePassword } from '../_actions/changePassword';

/**
 * The three password boxes, as rejection targets. Every rule this form has
 * belongs to exactly one of them — which is why the messages moved off the
 * shared banner: "Your current password is incorrect" shown above all three
 * leaves the reader working out which box to retype.
 */
type PasswordField = 'current' | 'new' | 'confirm';

const FIELD_ANCHOR_IDS: Record<PasswordField, string> = {
  current: 'currentPassword',
  new: 'newPassword',
  confirm: 'confirmNewPassword',
};

export function ChangePasswordForm() {
  const t = useTranslations('profile.changePassword');
  const tPassword = useTranslations('validation.password');
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submitError = useSubmitError<PasswordField>((field) => FIELD_ANCHOR_IDS[field]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitError.clear();

    if (newPassword !== confirmPassword) {
      submitError.report('confirm', t('passwordMismatch'));
      return;
    }

    const passwordError = getPasswordValidationError(newPassword);
    if (passwordError) {
      submitError.report('new', tPassword(passwordError, { minLength: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (currentPassword === newPassword) {
      submitError.report('new', t('passwordSameAsCurrent'));
      return;
    }

    setIsLoading(true);

    try {
      const changeResult = await changePassword(currentPassword, newPassword);

      if ('error' in changeResult) {
        const passwordErrorKey = parsePasswordServerError(changeResult.error);
        if (passwordErrorKey) {
          submitError.report(
            'new',
            tPassword(passwordErrorKey, { minLength: MIN_PASSWORD_LENGTH })
          );
        } else {
          switch (changeResult.error) {
            case 'currentPasswordIncorrect':
              submitError.report('current', t('currentPasswordIncorrect'));
              break;
            case 'passwordSameAsCurrent':
              submitError.report('new', t('passwordSameAsCurrent'));
              break;
            case 'rateLimited':
              submitError.report(null, t('rateLimited'));
              break;
            default:
              submitError.report(null, t('error'));
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
      submitError.report(null, t('error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Only what belongs to no single box (a rate limit, an unexpected
            server failure) — every rule about one password is shown at it. */}
        <FormErrorBanner
          ref={submitError.summaryRef}
          message={submitError.formMessage}
          variant="bordered"
        />

        <AuthField
          id="currentPassword"
          type="password"
          label={t('currentPasswordLabel')}
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          error={submitError.messageFor('current')}
        />

        <AuthField
          id="newPassword"
          type="password"
          label={t('newPasswordLabel')}
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          error={submitError.messageFor('new')}
        />

        <AuthField
          id="confirmNewPassword"
          type="password"
          label={t('confirmPasswordLabel')}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          error={submitError.messageFor('confirm')}
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
