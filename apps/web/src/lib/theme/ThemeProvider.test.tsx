import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { localStorageAdapter } from '@/lib/persistent-settings/local-storage-adapter';

import { ThemeProvider } from './ThemeProvider';
import { THEME_DARK_CLASS, THEME_LIGHT_CLASS, THEME_STORAGE_KEY } from './constants';

const html = () => document.documentElement;

afterEach(() => {
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  html().classList.remove(THEME_LIGHT_CLASS, THEME_DARK_CLASS);
  html().style.colorScheme = '';
});

describe('<ThemeProvider /> on mount', () => {
  it('puts the stored theme class back on <html> when nothing is there', () => {
    // ThemeScript ran at document parse and set the class; then React
    // remounted <html> on the client (a `[locale]` change, a hydration
    // failure at the root) and stripped every attribute, including `class`
    // and `style`. The provider mounts fresh in the same commit.
    localStorageAdapter.set(THEME_STORAGE_KEY, 'dark');
    html().classList.remove(THEME_LIGHT_CLASS, THEME_DARK_CLASS);
    html().style.colorScheme = '';

    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>
    );

    expect(html().classList.contains(THEME_DARK_CLASS)).toBe(true);
    expect(html().classList.contains(THEME_LIGHT_CLASS)).toBe(false);
    expect(html().style.colorScheme).toBe(THEME_DARK_CLASS);
  });

  it('resolves "system" through matchMedia rather than defaulting to light', () => {
    localStorageAdapter.set(THEME_STORAGE_KEY, 'system');
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? THEME_DARK_CLASS
      : THEME_LIGHT_CLASS;

    render(
      <ThemeProvider>
        <span />
      </ThemeProvider>
    );

    expect(html().classList.contains(system)).toBe(true);
  });
});
