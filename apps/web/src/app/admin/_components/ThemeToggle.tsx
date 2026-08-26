'use client';

import { useEffect, useState } from 'react';

import { useTheme } from '@/lib/theme/ThemeProvider';

/**
 * Theme switch for the admin panel, styled as a sidebar row rather than a bare
 * icon button: it lives at the foot of the sidebar next to the nav links, so it
 * shares their shape (full-width, same padding, same hover) instead of reading
 * as a stray control.
 *
 * The button only renders after mount because the resolved theme is not known
 * during SSR; the placeholder reserves the same height so the sidebar footer
 * does not shift once it appears.
 */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm transition-colors hover:bg-background"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
}
