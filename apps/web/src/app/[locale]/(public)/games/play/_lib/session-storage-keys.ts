/**
 * Session storage keys used by game play flow.
 * Centralized to avoid hardcoded string duplication across components and hooks.
 */
export const SESSION_STORAGE_KEYS = {
  SHOW_SAVE_TOAST: 'blindfold_chess_show_save_toast',
  SHOW_DELETE_TOAST: 'blindfold_chess_show_delete_toast',
  DELETED_COUNT: 'blindfold_chess_deleted_count',
} as const;
