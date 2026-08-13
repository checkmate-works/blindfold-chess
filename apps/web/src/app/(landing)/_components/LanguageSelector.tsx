'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from '@/config';
import { LOCALE_LABELS } from '@/i18n/locale-labels';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  currentLocale: Locale;
};

export function LanguageSelector({ currentLocale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;

    // Persist preference for other surfaces that fall back to
    // getLocaleFromRequest (e.g. the landing layout's <html lang> and
    // banner announcement). The LP itself no longer relies on the cookie
    // for locale resolution — the URL `?lang=` below is the source of
    // truth — but the cookie keeps non-landing contexts in sync.
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; expires=${expires.toUTCString()}`;

    // Landing locale resolver (`getLandingLocale`) prioritises `?lang=`
    // over cookie/Accept-Language, so the URL must change for the switch
    // to take effect on the LP. English is the bare-`/` default; other
    // locales use `/?lang=<code>` to match the canonical/hreflang cluster.
    const target = newLocale === DEFAULT_LOCALE ? '/' : `/?lang=${newLocale}`;
    startTransition(() => {
      router.push(target);
    });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <label htmlFor="language-selector" className="text-sm text-muted-foreground">
        Language:
      </label>
      <select
        id="language-selector"
        value={currentLocale}
        onChange={handleChange}
        disabled={isPending}
        className="cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABELS[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
