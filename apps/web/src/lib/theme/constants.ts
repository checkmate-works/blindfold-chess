// Shared constants for the custom theme provider. Kept outside of
// `"use client"` modules so the no-flash script (a Server Component) and the
// client provider can read the same values.

export const THEME_STORAGE_KEY = 'theme';
export const THEME_LIGHT_CLASS = 'light';
export const THEME_DARK_CLASS = 'dark';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
