'use client';

import { useId, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, TextInput } from '@/app/_components';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { localizeActionError } from '@/lib/i18n/localize-action-error';
import { ACCOUNT_PAGE_PATH } from '@/lib/users/account-page-notice';

import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { requestEmailChange } from '../_actions/requestEmailChange';
import type { RequestEmailChangeError } from '../_actions/requestEmailChange';

type Props = {
  email: string | undefined;
  /** The new address of a change that is waiting for its confirmations. */
  pendingEmail: string | undefined;
};

const EMAIL_CHANGE_ERRORS: ReadonlySet<RequestEmailChangeError> = new Set<RequestEmailChangeError>([
  'invalidEmail',
  'sameEmail',
  'emailUnavailable',
  'sendFailed',
  'rateLimited',
  'signInRequired',
  'banned',
]);

/**
 * The account's email address with a "Change" button that opens the new
 * address field inside the same card — no separate page or modal.
 *
 * Submitting asks the auth server to mail both the current and the new
 * address; nothing changes until both links are opened. After sending, the
 * page is reloaded (dropping any `?notice=`) so the pending line appears.
 */
export function EmailCard({ email, pendingEmail }: Props) {
  const t = useTranslations('MypageAccount.email');
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const inputId = useId();
  const errorId = useId();
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeForm = () => {
    setEditing(false);
    setNewEmail('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await requestEmailChange(newEmail);
      if ('error' in result) {
        setError(localizeActionError(result.error, t, EMAIL_CHANGE_ERRORS));
        return;
      }
      showToast(t('sentToast'), 'success');
      closeForm();
      // Dynamic route: the replace refetches the page, which drops any
      // `?notice=` and shows the pending line.
      router.replace(`/${locale}${ACCOUNT_PAGE_PATH}`);
    } catch {
      setError(t('errors.sendFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 break-all text-sm font-medium text-foreground">{email ?? '—'}</p>
        {!editing && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="shrink-0"
          >
            {t('change')}
          </Button>
        )}
      </div>

      {pendingEmail !== undefined && (
        <p role="status" className="text-xs leading-relaxed text-muted-foreground">
          {t('pending', { email: pendingEmail })}
        </p>
      )}

      {editing && (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
          <div>
            <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-foreground">
              {t('newEmailLabel')}
            </label>
            <TextInput
              id={inputId}
              type="email"
              inputSize="sm"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('newEmailPlaceholder')}
              required
              maxLength={254}
              autoComplete="email"
              autoFocus
              invalid={error !== null}
              aria-describedby={error ? errorId : undefined}
            />
            {error && (
              <p id={errorId} role="alert" className="mt-1 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={closeForm}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? t('submitting') : t('submit')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
