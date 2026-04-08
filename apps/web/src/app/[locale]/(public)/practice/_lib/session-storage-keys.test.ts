import { describe, expect, it } from 'vitest';

import { SESSION_STORAGE_KEYS } from './session-storage-keys';

describe('SESSION_STORAGE_KEYS', () => {
  it('should have EXP_RESULT key with expected value', () => {
    expect(SESSION_STORAGE_KEYS.EXP_RESULT).toBe('blindfold_chess_exp_result');
  });

  it('should have GRANTED_RANKS key with expected value', () => {
    expect(SESSION_STORAGE_KEYS.GRANTED_RANKS).toBe('blindfold_chess_granted_ranks');
  });

  it('should have SHOW_SAVE_ERROR_TOAST key with expected value', () => {
    expect(SESSION_STORAGE_KEYS.SHOW_SAVE_ERROR_TOAST).toBe(
      'blindfold_chess_show_practice_save_error_toast'
    );
  });

  it('should have exactly 3 keys', () => {
    expect(Object.keys(SESSION_STORAGE_KEYS)).toHaveLength(3);
  });
});
