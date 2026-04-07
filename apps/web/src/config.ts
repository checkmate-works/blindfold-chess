export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blindfold-chess.online'
).replace(/\/$/, '');
export const SITE_DOMAIN = 'blindfold-chess.online';
export const AUTHOR_NAME = 'CheckmateWorks';
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const COOKIEYES_ID = process.env.NEXT_PUBLIC_COOKIEYES_ID;

export const ADSENSE_PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID;
export const ADSENSE_SLOT_CONTENT_MIDDLE = process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_MIDDLE;
export const ADSENSE_SLOT_CONTENT_BOTTOM = process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_BOTTOM;
export const ADSENSE_SLOT_INFEED = process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED;
export const ADSENSE_INFEED_LAYOUT_KEY = process.env.NEXT_PUBLIC_ADSENSE_INFEED_LAYOUT_KEY;
export const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost');

export const SUPPORTED_LOCALES = ['en', 'es', 'ja'] as const;
export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// Keep in sync with Supabase Dashboard: Authentication > Settings > Password > "Minimum password length"
export const MIN_PASSWORD_LENGTH = 6;

export const MAX_GAMES = 20;

export const GAME_UPDATED_EVENT = 'blindfold-chess:game-updated';
export const NOTIFICATIONS_READ_EVENT = 'blindfold-chess:notifications-read';

export function notifyGameListUpdated() {
  window.dispatchEvent(new CustomEvent(GAME_UPDATED_EVENT));
}

export function notifyNotificationsRead() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
}
