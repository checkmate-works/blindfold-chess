/**
 * Server Action tests for `savePositionMemoryResult`.
 *
 * Contract under test:
 * - Custom FEN runs return `{ success: true }` WITHOUT touching auth/DB.
 * - `correctCount === 0` returns `{ success: true }` WITHOUT touching auth/DB.
 *   (The zero-grant early return must happen BEFORE the auth guard so that
 *   guests completing a skipped run do not get `signInRequired`.)
 * - Valid runs invoke `saveFreePlayResult` with sanitized
 *   (non-negative, rounded) counts and `menuType: 'position_memory'`.
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

describe('savePositionMemoryResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: TEST_USER_ID } });
    mockSaveFreePlayResult.mockResolvedValue({
      expEventId: 'evt-000',
      exp: { earnedExp: 75, totalExp: 75, level: 0, levelUp: false, progressPercent: 75 },
    });
    mockHandleServerActionError.mockImplementation((err: unknown) => ({
      success: false,
      error: err instanceof Error ? err.message : 'unexpected_error',
    }));
  });

  it('returns success without DB writes when isCustomFen=true', async () => {
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 10,
      mistakes: 0,
      isCustomFen: true,
    });

    expect(result).toEqual({ success: true });
    expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('returns success without DB writes when correctCount=0 (skipped run)', async () => {
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 0,
      mistakes: 3,
      isCustomFen: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('early-returns for correctCount=0 BEFORE the auth guard (guests skipping runs do not see signInRequired)', async () => {
    // Strong guard against the failure mode where the auth check runs first
    // and guests get an error for a run that would earn 0 EXP anyway.
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 0,
      mistakes: 0,
      isCustomFen: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockAuthenticateAndGuard).not.toHaveBeenCalled();
  });

  it('sanitizes negative counts to 0 (treated as zero-grant, early return)', async () => {
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: -3,
      mistakes: -1,
      isCustomFen: false,
    });

    expect(result).toEqual({ success: true });
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('rounds fractional counts before calling saveFreePlayResult', async () => {
    const { savePositionMemoryResult } = await import('./save-result');

    await savePositionMemoryResult({
      correctCount: 10.6,
      mistakes: 2.4,
      isCustomFen: false,
    });

    expect(mockSaveFreePlayResult).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      menuType: 'position_memory',
      correctCount: 11,
      mistakes: 2,
    });
  });

  it('returns {success, expEventId} on successful grant', async () => {
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 10,
      mistakes: 0,
      isCustomFen: false,
    });

    expect(result).toEqual({ success: true, expEventId: 'evt-000' });
    expect(mockSaveFreePlayResult).toHaveBeenCalledWith({
      userId: TEST_USER_ID,
      menuType: 'position_memory',
      correctCount: 10,
      mistakes: 0,
    });
  });

  it('propagates signInRequired from authenticateAndGuard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 10,
      mistakes: 0,
      isCustomFen: false,
    });

    expect(result).toEqual({ success: false, error: 'signInRequired' });
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('propagates banned from authenticateAndGuard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'banned' });
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 5,
      mistakes: 1,
      isCustomFen: false,
    });

    expect(result).toEqual({ success: false, error: 'banned' });
    expect(mockSaveFreePlayResult).not.toHaveBeenCalled();
  });

  it('propagates rateLimited from authenticateAndGuard', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'rateLimited' });
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 5,
      mistakes: 0,
      isCustomFen: false,
    });

    expect(result).toEqual({ success: false, error: 'rateLimited' });
  });

  it('routes thrown errors through handleServerActionError', async () => {
    mockSaveFreePlayResult.mockRejectedValueOnce(new Error('db_down'));
    const { savePositionMemoryResult } = await import('./save-result');

    const result = await savePositionMemoryResult({
      correctCount: 5,
      mistakes: 0,
      isCustomFen: false,
    });

    expect(mockHandleServerActionError).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: false, error: 'db_down' });
  });
});
