'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

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
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
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
        <label
          key={themeOption.id}
          className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent cursor-pointer"
        >
          <div className="flex items-center">
            <input
              type="radio"
              name="themeMode"
              value={themeOption.id}
              checked={theme === themeOption.id}
              onChange={() => setTheme(themeOption.id)}
              className="h-4 w-4 text-primary focus:ring-primary border-border"
            />
            <span className="ml-3 text-sm text-foreground">{themeOption.label}</span>
          </div>
          <span className="text-xs text-muted-foreground">{themeOption.description}</span>
        </label>
      ))}
    </div>
  );
}
