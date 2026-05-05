'use client';

import type { ReactNode } from 'react';

import { Link } from '@/i18n/routing';
import { useSafeLocale as useLocale } from '@/i18n/use-safe-locale';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

type Props = {
  children: ReactNode;
};

/**
 * Render a create-form behind a sticky sign-up CTA so guests can preview
 * what the form looks like without being able to fill it in. The form
 * itself is `inert` + `aria-hidden`, leaving only the CTA reachable via
 * keyboard or AT.
 *
 * Stacking is done with a single-cell CSS grid (form and overlay in the
 * same `row-start-1 col-start-1`) rather than `position: absolute`. This
 * way the CTA's `position: sticky` works against page scroll — an absolute
 * container would clip the sticky element to its own non-scrolling box.
 */
export function GuestCreateGate({ children }: Props) {
  const t = useTranslations('authPrompt');
  const locale = useLocale();

  return (
    <div className="relative grid">
      <div inert aria-hidden="true" className="col-start-1 row-start-1 opacity-50 select-none">
        {children}
      </div>

      <div className="col-start-1 row-start-1 z-10 pointer-events-none px-4">
        <div className="sticky top-8 mx-auto max-w-md pt-8 pointer-events-auto">
          <div className="rounded-lg border border-border bg-card p-6 shadow-xl text-center space-y-4">
            <h2 className="text-xl font-bold text-foreground">{t('title')}</h2>
            <p className="text-muted-foreground">{t('createDescription')}</p>
            <div className="flex flex-col gap-3 pt-2">
              <Link
                href="/sign-up"
                locale={locale}
                className="block w-full rounded-md px-4 py-2 text-center font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('signUpButton')}
              </Link>
              <Link
                href="/sign-in"
                locale={locale}
                className="block w-full rounded-md px-4 py-2 text-center font-medium bg-card border border-border text-foreground hover:bg-muted transition-colors"
              >
                {t('signInButton')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
