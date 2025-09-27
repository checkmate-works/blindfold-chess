export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blindfold-chess.online';
export const siteName = 'Blindfold Chess';
export const authorName = 'CheckmateWorks';
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const locales = [
  {
    code: 'en',
    label: 'English',
    flag: '🇬🇧',
    subtitle: 'Continue in English',
  },
  {
    code: 'ja',
    label: '日本語',
    flag: '🇯🇵',
    subtitle: '日本語で続ける',
  },
] as const;

export const defaultLocale = 'en';

export type Locale = (typeof locales)[number]['code'];
