'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { SUPPORTED_LOCALES } from '@/config';
import { LOCALE_LABELS } from '@/i18n/locale-labels';
import { FaGlobe } from 'react-icons/fa';

/**
 * Human-readable label for each supported locale, shown in the language
 * switcher UI. Typed as a mapped type over `SUPPORTED_LOCALES` so that
 * adding a new locale to the array without adding a label here is a
 * compile-time error — the switcher can never render an empty option.
 */
type Props = {
  currentLocale: string;
};

export function LanguageSwitcher({ currentLocale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Pages where language switching should be disabled to prevent state loss
  const shouldHideLanguageSwitcher = () => {
    const pathWithoutLocale = pathname.replace(`/${currentLocale}`, '');

    // List of paths where language switching would interrupt user activity
    const restrictedPaths = [
      '/games/play',
      '/practice/coordinate-quiz',
      '/practice/legal-moves',
      '/practice/algebraic-notation',
      '/practice/square-colors',
      '/practice/position-memory',
      '/games/new',
    ];

    return restrictedPaths.some((path) => pathWithoutLocale.startsWith(path));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    const qs = searchParams.toString();
    router.push(qs ? `${newPathname}?${qs}` : newPathname);
  };

  if (shouldHideLanguageSwitcher()) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <FaGlobe className="h-4 w-4 text-muted-foreground" />
      <select
        value={currentLocale}
        onChange={handleLanguageChange}
        className="px-2 py-1 text-sm bg-transparent border border-border rounded text-muted-foreground hover:text-foreground focus:text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors cursor-pointer"
        aria-label="Select language"
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
