'use client';

import { useId } from 'react';

import { Button } from '@/app/_components';
import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import { useCurrentPathAsNext } from '@/app/[locale]/_hooks/use-current-path-as-next';

import { CloseButton } from './CloseButton';
import { Modal } from './Modal';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * The gate shown when a not-fully-registered viewer taps a members-only action
 * (via {@link useAuthGuard}). Two variants:
 * - anonymous → sign up / sign in;
 * - provisional (signed in, no profile / username yet) → finish registration
 *   at `setup-username`.
 *
 * Both are surfaced from the same `isOpen`, so every `useAuthGuard` call site
 * gets the right prompt without knowing which state the viewer is in.
 *
 * The actions are links (a navigation, not a form submit) wearing `Button`'s
 * `asChild` span, so they get the same 48px full-width treatment as the
 * practice result screens' primary actions instead of a hand-rolled 40px.
 */
export function AuthPromptModal({ isOpen, onClose }: Props) {
  const t = useTranslations('authPrompt');
  const locale = useLocale();
  const titleId = useId();
  const descriptionId = useId();
  const { isProvisional } = useAuth();
  // Return the viewer here after they sign in, instead of the default mypage.
  const next = encodeURIComponent(useCurrentPathAsNext());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="relative space-y-4">
        <CloseButton
          onClick={onClose}
          size="w-5 h-5"
          className="absolute top-0 right-0 text-muted-foreground hover:text-foreground transition-colors"
        />

        {isProvisional ? (
          <>
            <h2 id={titleId} className="text-xl font-bold text-foreground pr-8">
              {t('provisional.title')}
            </h2>
            <p id={descriptionId} className="text-muted-foreground">
              {t('provisional.description')}
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/mypage/setup-username"
                locale={locale}
                className="block w-full"
                onClick={onClose}
              >
                <Button asChild variant="primary" size="lg" fullWidth>
                  {t('provisional.button')}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 id={titleId} className="text-xl font-bold text-foreground pr-8">
              {t('title')}
            </h2>
            <p id={descriptionId} className="text-muted-foreground">
              {t('description')}
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href={`/sign-up?next=${next}`}
                locale={locale}
                className="block w-full"
                onClick={onClose}
              >
                <Button asChild variant="primary" size="lg" fullWidth>
                  {t('signUpButton')}
                </Button>
              </Link>
              <Link
                href={`/sign-in?next=${next}`}
                locale={locale}
                className="block w-full"
                onClick={onClose}
              >
                <Button asChild variant="outline" size="lg" fullWidth>
                  {t('signInButton')}
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
