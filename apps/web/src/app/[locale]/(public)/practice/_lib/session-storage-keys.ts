/**
 * Session storage keys used by practice challenge flow.
 * Centralized to avoid hardcoded string duplication across components and hooks.
 */
export const SESSION_STORAGE_KEYS = {
  GRANTED_RANKS: 'blindfold_chess_granted_ranks',
  SHOW_SAVE_ERROR_TOAST: 'blindfold_chess_show_practice_save_error_toast',
} as const;
