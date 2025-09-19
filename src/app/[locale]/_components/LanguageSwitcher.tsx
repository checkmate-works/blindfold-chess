'use client';

import { usePathname, useRouter } from 'next/navigation';
import { FaGlobe } from 'react-icons/fa';
import { locales } from '@/config';

interface LanguageSwitcherProps {
  currentLocale: string;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    // Replace the current locale in the pathname with the new one
    const newPathname = pathname.replace(`/${currentLocale}`, `/${newLocale}`);
    router.push(newPathname);
  };

  return (
    <div className="flex items-center gap-2">
      <FaGlobe className="h-4 w-4 text-muted-foreground" />
      <select
        value={currentLocale}
        onChange={handleLanguageChange}
        className="px-2 py-1 text-sm bg-transparent border border-border rounded text-muted-foreground hover:text-foreground focus:text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors cursor-pointer"
        aria-label="Select language"
      >
        {locales.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.label}
          </option>
        ))}
      </select>
    </div>
  );
}
