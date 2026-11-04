'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { LinkedIdentity, LoginMethods } from '@blindfold-chess/features/account';
import { evaluateIdentityRemoval } from '@blindfold-chess/features/account';
import { FcGoogle } from 'react-icons/fc';

import { localizeActionError } from '@/lib/i18n/localize-action-error';
import { createClient } from '@/lib/supabase/client';
import {
  ACCOUNT_PAGE_PATH,
  LINK_RETURN_GOOGLE,
  LINK_RETURN_PARAM,
} from '@/lib/users/account-page-notice';

import { ConfirmationModal } from '@/app/[locale]/_components/ConfirmationModal';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';

import { requestPasswordSetup } from '../_actions/requestPasswordSetup';
import type { RequestPasswordSetupError } from '../_actions/requestPasswordSetup';
import { unlinkLoginIdentity } from '../_actions/unlinkLoginIdentity';
import type { UnlinkLoginIdentityError } from '../_actions/unlinkLoginIdentity';
import { LoginMethodRow } from './LoginMethodRow';

type Props = LoginMethods & {
  email: string | undefined;
};

const PASSWORD_ERRORS: ReadonlySet<RequestPasswordSetupError> = new Set<RequestPasswordSetupError>([
  'noEmail',
  'sendFailed',
  'rateLimited',
  'signInRequired',
  'banned',
]);

const UNLINK_ERRORS: ReadonlySet<UnlinkLoginIdentityError> = new Set<UnlinkLoginIdentityError>([
  'removal:notLinked',
  'removal:notRemovable',
  'removal:lastWebMethod',
  'unlinkFailed',
  'rateLimited',
  'signInRequired',
  'banned',
]);

/** What is in flight: the password email, the hop to Google, or an unlink by identity id. */
type Busy = 'password' | 'google' | { unlinking: string };

/**
 * The list of login methods.
 *
 * First row: email + password (set / not set, with a button that mails the
 * set-up or change link). Then one row per Google / Apple identity with the
 * linked address and "Remove", and finally "Add a Google account". Several
 * identities of the same provider are all listed — a user re-pointing their
 * Google login sees old and new side by side until they remove the old one.
 *
 * "Remove" is disabled by the same guard the Server Action runs
 * (`evaluateIdentityRemoval`), with the reason shown under the row; when it is
 * enabled a confirmation dialog is shown first. Adding a Google account hands
 * the browser to the auth server's `linkIdentity`; the result comes back
 * through `/auth/callback`, which lands here with a `?notice=`.
 */
export function LoginMethodsCard({ identities, hasPassword, email }: Props) {
  const t = useTranslations('MypageAccount.methods');
  const tProviders = useTranslations('MypageAccount.providers');
  const locale = useLocale();
  const router = useRouter();
  const { showToast } = useToast();
  const [removing, setRemoving] = useState<LinkedIdentity | undefined>();
  const [busy, setBusy] = useState<Busy | undefined>();

  const methods: LoginMethods = { identities, hasPassword };
  const accountPath = `/${locale}${ACCOUNT_PAGE_PATH}`;

  const handlePasswordSetup = async () => {
    setBusy('password');
    try {
      const result = await requestPasswordSetup();
      if ('error' in result) {
        showToast(localizeActionError(result.error, t, PASSWORD_ERRORS), 'error');
        return;
      }
      showToast(t('password.sentToast', { email: result.email }), 'success');
    } catch {
      showToast(t('errors.generic'), 'error');
    } finally {
      setBusy(undefined);
    }
  };

  const handleUnlink = async () => {
    if (!removing) return;
    const target = removing;
    setRemoving(undefined);
    setBusy({ unlinking: target.id });
    try {
      const result = await unlinkLoginIdentity(target.id);
      if ('error' in result) {
        showToast(localizeActionError(result.error, t, UNLINK_ERRORS), 'error');
        return;
      }
      showToast(t('removedToast'), 'success');
      router.replace(accountPath);
      router.refresh();
    } catch {
      showToast(t('errors.generic'), 'error');
    } finally {
      setBusy(undefined);
    }
  };

  const handleAddGoogle = async () => {
    setBusy('google');
    try {
      const supabase = createClient();
      if (!supabase) {
        showToast(t('errors.generic'), 'error');
        setBusy(undefined);
        return;
      }
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      callbackUrl.searchParams.set(LINK_RETURN_PARAM, LINK_RETURN_GOOGLE);
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: callbackUrl.toString() },
      });
      if (error) {
        showToast(t('errors.generic'), 'error');
        setBusy(undefined);
      }
      // On success the browser is leaving for Google; the button stays busy.
    } catch {
      showToast(t('errors.generic'), 'error');
      setBusy(undefined);
    }
  };

  const isUnlinking = (identityId: string) =>
    typeof busy === 'object' && busy.unlinking === identityId;

  return (
    <>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        <LoginMethodRow
          title={tProviders('email')}
          detail={hasPassword ? t('password.set') : t('password.unset')}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePasswordSetup}
              disabled={busy !== undefined}
            >
              {busy === 'password'
                ? t('password.sending')
                : hasPassword
                  ? t('password.change')
                  : t('password.setup')}
            </Button>
          }
        />

        {identities
          .filter((identity) => identity.provider !== 'email')
          .map((identity) => {
            const decision = evaluateIdentityRemoval(methods, identity.id);
            return (
              <LoginMethodRow
                key={identity.id}
                title={tProviders(identity.provider)}
                detail={identity.email}
                note={
                  !decision.allowed && decision.reason === 'lastWebMethod'
                    ? t('cannotRemove.lastWebMethod')
                    : undefined
                }
                action={
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setRemoving(identity)}
                    disabled={!decision.allowed || busy !== undefined}
                  >
                    {isUnlinking(identity.id) ? t('removing') : t('remove')}
                  </Button>
                }
              />
            );
          })}

        <div className="px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddGoogle}
            disabled={busy !== undefined}
          >
            <FcGoogle className="h-4 w-4" aria-hidden="true" />
            <span>{busy === 'google' ? t('google.adding') : t('google.add')}</span>
          </Button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={removing !== undefined}
        title={t('confirmRemove.title', {
          provider: removing ? tProviders(removing.provider) : '',
        })}
        message={t('confirmRemove.message', { email: removing?.email ?? email ?? '' })}
        confirmText={t('confirmRemove.ok')}
        cancelText={t('confirmRemove.cancel')}
        confirmVariant="danger"
        onConfirm={handleUnlink}
        onCancel={() => setRemoving(undefined)}
      />
    </>
  );
}
