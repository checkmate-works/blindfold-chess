'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  type ResolvedTheme,
  THEME_DARK_CLASS,
  THEME_LIGHT_CLASS,
  THEME_STORAGE_KEY,
  type Theme,
} from './constants';

// Minimal replacement for next-themes. Intentionally omits features we do not
// use (forced themes, custom themes, system-event nonce, etc.) and, crucially,
// does NOT render a bootstrap <script> in the React tree — that is handled by
// <ThemeScript /> in each root layout (a Server Component).

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  // Accepts a string for API parity with next-themes (some call sites pass
  // values from a runtime-widened array); invalid values are coerced to
  // 'system'.
  setTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return THEME_LIGHT_CLASS;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_DARK_CLASS
    : THEME_LIGHT_CLASS;
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // ignore (Safari private mode, etc.)
  }
  return 'system';
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.remove(THEME_LIGHT_CLASS, THEME_DARK_CLASS);
  root.classList.add(resolved);
  root.style.colorScheme = resolved;
}

type ProviderProps = {
  children: ReactNode;
  /**
   * When true, transitions are briefly disabled while switching themes to
   * avoid animated flicker. Kept for API parity with next-themes.
   */
  disableTransitionOnChange?: boolean;
};

export function ThemeProvider({ children, disableTransitionOnChange = false }: ProviderProps) {
  // `theme` is the user's preference ('system' | 'light' | 'dark').
  // Start from 'system' so SSR and the first client render agree; the
  // ThemeScript has already applied the real class on <html> before paint.
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(THEME_LIGHT_CLASS);

  // Hydrate from localStorage + matchMedia after mount.
  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    setResolvedTheme(stored === 'system' ? getSystemTheme() : stored);
  }, []);

  // React to OS-level theme changes when in 'system' mode.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const next: ResolvedTheme = mql.matches ? THEME_DARK_CLASS : THEME_LIGHT_CLASS;
      setResolvedTheme(next);
      applyTheme(next);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  // Sync preference across tabs.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const stored = readStoredTheme();
      setThemeState(stored);
      const next = stored === 'system' ? getSystemTheme() : stored;
      setResolvedTheme(next);
      applyTheme(next);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setTheme = useCallback(
    (raw: string) => {
      if (typeof window === 'undefined') return;
      const next: Theme = raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';

      // Briefly disable CSS transitions while toggling to avoid flicker.
      let cleanupTransitions: (() => void) | null = null;
      if (disableTransitionOnChange) {
        const style = document.createElement('style');
        style.appendChild(
          document.createTextNode(
            '*,*::before,*::after{transition:none!important;animation:none!important}'
          )
        );
        document.head.appendChild(style);
        cleanupTransitions = () => {
          // Force style flush then remove.
          window.getComputedStyle(document.body);
          document.head.removeChild(style);
        };
      }

      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // ignore
      }
      setThemeState(next);
      const resolved: ResolvedTheme = next === 'system' ? getSystemTheme() : next;
      setResolvedTheme(resolved);
      applyTheme(resolved);

      if (cleanupTransitions) {
        window.setTimeout(cleanupTransitions, 1);
      }
    },
    [disableTransitionOnChange]
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  // Mirror next-themes' lenient behavior: return a no-op object if used
  // outside a provider (e.g., isolated tests).
  return {
    theme: 'system',
    resolvedTheme: THEME_LIGHT_CLASS,
    setTheme: () => {},
  };
}
