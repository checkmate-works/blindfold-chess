'use client';

import { useTransition } from 'react';

import { useRouter } from 'next/navigation';

import { LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Human-readable label for each supported locale, shown in the landing-page
 * language selector. Typed as `Record<Locale, string>` so that adding a new
 * locale to `SUPPORTED_LOCALES` without adding a label here is a
 * compile-time error — the selector can never render an empty option.
 */
const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  ja: '日本語',
};

type Props = {
  currentLocale: Locale;
};

export function LanguageSelector({ currentLocale }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;

    // Set cookie with 1 year expiry
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; expires=${expires.toUTCString()}`;

    // Refresh to apply new locale
    startTransition(() => {
      router.refresh();
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
