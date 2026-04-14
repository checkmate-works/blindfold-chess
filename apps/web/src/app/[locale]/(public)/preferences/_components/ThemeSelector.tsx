'use client';

import { useEffect, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useTheme } from '@/lib/theme';

import { PreferenceOption } from './PreferenceOption';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations('Preferences');

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  const themes = [
    {
      id: 'system',
      label: t('appearance.themes.system'),
      description: t('appearance.themes.systemDescription'),
    },
    {
      id: 'light',
      label: t('appearance.themes.light'),
      description: t('appearance.themes.lightDescription'),
    },
    {
      id: 'dark',
      label: t('appearance.themes.dark'),
      description: t('appearance.themes.darkDescription'),
    },
  ];

  return (
    <div className="space-y-2">
      {themes.map((themeOption) => (
        <PreferenceOption
          key={themeOption.id}
          type="radio"
          name="themeMode"
          value={themeOption.id}
          checked={theme === themeOption.id}
          onChange={() => setTheme(themeOption.id)}
          label={themeOption.label}
          description={themeOption.description}
        />
      ))}
    </div>
  );
}
