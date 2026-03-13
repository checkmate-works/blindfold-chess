export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.blindfold-chess.online';
export const SITE_NAME = 'Blindfold Chess';
export const SITE_DOMAIN = 'blindfold-chess.online';
export const AUTHOR_NAME = 'CheckmateWorks';
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
export const COOKIEYES_ID = process.env.NEXT_PUBLIC_COOKIEYES_ID;

export const SUPPORTED_LOCALES = ['en', 'ja'] as const;
export const DEFAULT_LOCALE = 'en';
export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';

export const MAX_GAMES = 20;

export const GAME_UPDATED_EVENT = 'blindfold-chess:game-updated';
export const NOTIFICATIONS_READ_EVENT = 'blindfold-chess:notifications-read';

export function notifyGameListUpdated() {
  window.dispatchEvent(new CustomEvent(GAME_UPDATED_EVENT));
}

export function notifyNotificationsRead() {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_EVENT));
}
