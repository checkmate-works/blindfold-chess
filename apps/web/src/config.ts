export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blindfold-chess.online';
export const SITE_NAME = 'Blindfold Chess';
export const SITE_DOMAIN = 'blindfold-chess.online';
export const AUTHOR_NAME = 'CheckmateWorks';
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const COOKIEYES_ID = process.env.NEXT_PUBLIC_COOKIEYES_ID;

export const SUPPORTED_LOCALES = ['en', 'ja'] as const;
export const DEFAULT_LOCALE = 'en';

export const MAX_GAMES = 20;

export const STORAGE_KEYS = {
  GAME_UPDATED: 'blindfold_chess_game_updated',
} as const;
