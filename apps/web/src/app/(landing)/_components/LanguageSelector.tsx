'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { LOCALE_COOKIE_NAME } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

type Props = {
  currentLocale: Locale;
};

export function LanguageSelector({ currentLocale }: Props) {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value as Locale;
    setIsChanging(true);

    // Set cookie with 1 year expiry
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; expires=${expires.toUTCString()}`;

    // Refresh to apply new locale
    router.refresh();
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
        disabled={isChanging}
        className="cursor-pointer rounded-md border border-border bg-card px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </div>
  );
}
