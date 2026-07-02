'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaLock } from 'react-icons/fa';

import { useCurrentPathAsNext } from '@/app/[locale]/_hooks/use-current-path-as-next';

type Props = {
  children: ReactNode;
  /**
   * Headline + sub-copy for the CTA. Default to the result-page "see your game
   * stats" wording; the shared game detail page overrides them to frame the
   * stats as a members-only feature for anonymous viewers.
   */
  title?: string;
  description?: string;
};

/**
 * Auth gate for a game-statistics section. Renders the stats blurred and
 * non-interactive behind a registration CTA, nudging anonymous viewers to
 * create an account. Logged-in users never see this — the caller renders the
 * stats directly instead. Reused by the result page (own game) and the shared
 * game detail page (someone else's game), which pass their own copy.
 */
export function StatsAuthGate({ children, title, description }: Props) {
  const t = useTranslations('play');
  const locale = useLocale();
  // Return the viewer here after they sign in, instead of the default mypage.
  const next = encodeURIComponent(useCurrentPathAsNext());

  return (
    <div className="relative min-h-[22rem] py-6">
      <div className="pointer-events-none select-none blur-sm" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FaLock className="h-5 w-5" />
          </span>
        </div>
        <h3 className="text-lg font-bold text-foreground">
          {title ?? t('result.statsGate.title')}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {description ?? t('result.statsGate.description')}
        </p>
        <div className="flex w-full max-w-xs flex-col gap-3 pt-1">
          <Link
            href={`/sign-up?next=${next}`}
            locale={locale}
            className="block w-full rounded-md bg-primary px-4 py-2 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('result.statsGate.signUpButton')}
          </Link>
          <Link
            href={`/sign-in?next=${next}`}
            locale={locale}
            className="block w-full rounded-md border border-border bg-card px-4 py-2 text-center font-medium text-foreground transition-colors hover:bg-muted"
          >
            {t('result.statsGate.signInButton')}
          </Link>
        </div>
      </div>
    </div>
  );
}
