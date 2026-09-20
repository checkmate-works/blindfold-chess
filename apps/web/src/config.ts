export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blindfold-chess.online'
).replace(/\/$/, '');
export const SITE_DOMAIN = (() => {
  try {
    return new URL(SITE_URL).hostname.replace(/^www\./, '');
  } catch {
    return 'blindfold-chess.online';
  }
})();
export const AUTHOR_NAME = 'CheckmateWorks';
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const IS_LOCAL_DEV =
  process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SITE_URL?.includes('localhost');

/**
 * Re-exported so the ~85 call sites that read the locale list from `@/config`
 * keep one import path, while the list itself lives in the shared package
 * the mobile app also reads. The identifier policy and the SEO reasoning
 * behind `pt-BR` are documented on the declaration there.
 */
export { SUPPORTED_LOCALES } from '@blindfold-chess/types';
export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

// Keep in sync with Supabase Dashboard: Authentication > Settings > Password > "Minimum password length"
export const MIN_PASSWORD_LENGTH = 6;

export const MAX_GAMES = 20;

/** Below this many remaining save slots, `/games` shows a low-slots warning. */
export const GAME_LIMIT_WARNING_THRESHOLD = 3;

export const GAME_UPDATED_EVENT = 'blindfold-chess:game-updated';
export const NOTIFICATIONS_READ_EVENT = 'blindfold-chess:notifications-read';

export function notifyGameListUpdated() {
  window.dispatchEvent(new CustomEvent(GAME_UPDATED_EVENT));
}

export function notifyNotificationsRead() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
}
