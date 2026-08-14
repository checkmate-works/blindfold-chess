/**
 * Server Action tests for `savePuzzleResult`.
 *
 * Contract under test:
 * - `playerMoveCount === 0` returns `{ success: true }` WITHOUT touching auth/DB.
 *   (The zero-grant early return must happen BEFORE the auth guard so guests
 *   on the unsolved-defensive path do not see `signInRequired`.)
 * - Valid runs invoke `saveFreePlayResult` with sanitized counts, with
 *   `correctCount = playerMoveCount` and `mistakes = incorrectAttempts + peekCount`,
 *   and `menuType: 'puzzle'`.
 * - Auth failure paths (`signInRequired`, `banned`, rate-limit) surface the
 *   error string verbatim from `authenticateAndGuard`.
 * - Thrown errors are funneled through `handleServerActionError`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthenticateAndGuard = vi.fn();
const mockSaveFreePlayResult = vi.fn();
const mockHandleServerActionError = vi.fn();

vi.mock('@/lib/auth', () => ({
  authenticateAndGuard: (...args: unknown[]) => mockAuthenticateAndGuard(...args),
}));

vi.mock('@/lib/db/save-free-play-result', () => ({
  saveFreePlayResult: (...args: unknown[]) => mockSaveFreePlayResult(...args),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  RATE_LIMITS: {
    savePracticeResult: { maxAttempts: 10, windowMs: 60_000 },
  },
}));

vi.mock('@/lib/server-action-error', () => ({
  handleServerActionError: (...args: unknown[]) => mockHandleServerActionError(...args),
}));

const TEST_USER_ID = 'user-00000000-0000-0000-0000-000000000001';

describe('savePuzzleResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockSaveFreePlayResult.mockResolvedValue({
      expEventId: 'evt-puzzle-000',
      exp: { earnedExp: 36, totalExp: 36, level: 0, levelUp: false, progressPercent: 36 },
    });
    mockHandleServerActionError.mockImplementation((err: unknown) => ({
      success: false,
      error: err instanceof Error ? err.message : 'unexpected_error',
    }));
  });

  it('returns success without DB writes when playerMoveCount=0', async () => {
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: 0,
      incorrectAttempts: 2,
      peekCount: 1,
    });

    expect(result).toEqual({ success: true });
    expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('early-returns for playerMoveCount=0 BEFORE the auth guard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: 0,
      incorrectAttempts: 0,
      peekCount: 0,
    });

    expect(result).toEqual({ success: true });
    expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
  });

  it('sanitizes negative counts to 0 (treated as zero-grant, early return)', async () => {
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: -3,
      incorrectAttempts: -1,
      peekCount: -2,
    });

    expect(result).toEqual({ success: true });
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('rounds fractional counts before calling saveFreePlayResult', async () => {
    const { savePuzzleResult } = await import('./savePuzzleResult');

    await savePuzzleResult({
      playerMoveCount: 3.6,
      incorrectAttempts: 1.4,
      peekCount: 0.5,
    });

    expect(mockSaveFreePlayResult).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      menuType: 'puzzle',
      correctCount: 4,
      // round-half-to-even: 1.4 → 1, 0.5 → 1 (per Math.round semantics in JS: 0.5 → 1)
      mistakes: 1 + 1,
    });
  });

  it('combines incorrectAttempts and peekCount into mistakes', async () => {
    const { savePuzzleResult } = await import('./savePuzzleResult');

    await savePuzzleResult({
      playerMoveCount: 3,
      incorrectAttempts: 2,
      peekCount: 1,
    });

    expect(mockSaveFreePlayResult).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      menuType: 'puzzle',
      correctCount: 3,
      mistakes: 3,
    });
  });

  it('returns {success, expEventId} on successful grant', async () => {
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: 3,
      incorrectAttempts: 0,
      peekCount: 0,
    });

    expect(result).toEqual({ success: true, expEventId: 'evt-puzzle-000' });
    expect(mockSaveFreePlayResult).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      menuType: 'puzzle',
      correctCount: 3,
      mistakes: 0,
    });
  });

  it('propagates signInRequired from authenticateAndGuard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: 3,
      incorrectAttempts: 0,
      peekCount: 0,
    });

    expect(result).toEqual({ success: false, error: 'signInRequired' });
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('propagates banned from authenticateAndGuard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'banned' });
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: 1,
      incorrectAttempts: 1,
      peekCount: 0,
    });

    expect(result).toEqual({ success: false, error: 'banned' });
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('propagates rateLimited from authenticateAndGuard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'rateLimited' });
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: 1,
      incorrectAttempts: 0,
      peekCount: 0,
    });

    expect(result).toEqual({ success: false, error: 'rateLimited' });
  });

  it('routes thrown errors through handleServerActionError', async () => {
    mockSaveFreePlayResult.mockRejectedValueOnce(new Error('db_down'));
    const { savePuzzleResult } = await import('./savePuzzleResult');

    const result = await savePuzzleResult({
      playerMoveCount: 3,
      incorrectAttempts: 0,
      peekCount: 0,
    });

    expect(mockHandleServerActionError).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: false, error: 'db_down' });
  });
});
