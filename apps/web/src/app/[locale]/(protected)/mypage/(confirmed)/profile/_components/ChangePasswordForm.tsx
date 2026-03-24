'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { MIN_PASSWORD_LENGTH } from '@/config';

import {
  getPasswordValidationError,
  isPasswordValidationErrorKey,
} from '@/lib/validations/password';

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
        const serverError = changeResult.error;
        if (serverError.startsWith('password:')) {
          const key = serverError.slice('password:'.length);
          if (isPasswordValidationErrorKey(key)) {
            setError(tPassword(key, { minLength: MIN_PASSWORD_LENGTH }));
          } else {
            setError(t('error'));
          }
        } else {
          switch (serverError) {
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

        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-foreground mb-1"
          >
            {t('currentPasswordLabel')}
          </label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-1">
            {t('newPasswordLabel')}
          </label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label
            htmlFor="confirmNewPassword"
            className="block text-sm font-medium text-foreground mb-1"
          >
            {t('confirmPasswordLabel')}
          </label>
          <input
            id="confirmNewPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t('submitLoading') : t('submit')}
        </button>
      </form>
    </section>
  );
}
