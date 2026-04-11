/**
 * Tests for `saveFreePlayResult` — the thin transaction wrapper around
 * `grantPracticeExp`.
 *
 * The wrapper is intentionally small, but these tests pin two contracts:
 * 1. The call is wrapped in `db.transaction(...)` (so a failure rolls back).
 * 2. Inputs are forwarded verbatim to `grantPracticeExp`, and its output
 *    is reshaped into `{ expEventId, exp }` for the action-layer caller.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTransaction = vi.fn();
const mockGrantPracticeExp = vi.fn();

vi.mock('server-only', () => ({}));

vi.mock('./index', () => ({
  db: {
    transaction: (cb: (tx: unknown) => unknown) => mockTransaction(cb),
  },
}));

vi.mock('./save-exp', () => ({
  grantPracticeExp: (...args: unknown[]) => mockGrantPracticeExp(...args),
}));

describe('saveFreePlayResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: forward the callback to a fake tx object, matching the
    // real db.transaction contract.
    mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({ __tx: true }));
    mockGrantPracticeExp.mockResolvedValue({
      expEventId: 'evt-xyz',
      grantedExp: 75,
      expInfo: {
        earnedExp: 75,
        totalExp: 75,
        level: 0,
        levelUp: false,
        progressPercent: 75,
      },
    });
  });

  it('invokes db.transaction and calls grantPracticeExp with the forwarded tx + inputs', async () => {
    const { saveFreePlayResult } = await import('./save-free-play-result');

    await saveFreePlayResult({
      userId: 'user-1',
      menuType: 'position_memory',
      correctCount: 10,
      mistakes: 2,
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockGrantPracticeExp).toHaveBeenCalledTimes(1);
    expect(mockGrantPracticeExp).toHaveBeenCalledWith(
      { __tx: true },
      {
        userId: 'user-1',
        menuType: 'position_memory',
        correctCount: 10,
        mistakes: 2,
      }
    );
  });

  it('reshapes grantPracticeExp output to {expEventId, exp}', async () => {
    const { saveFreePlayResult } = await import('./save-free-play-result');

    const out = await saveFreePlayResult({
      userId: 'user-1',
      menuType: 'position_memory',
      correctCount: 5,
      mistakes: 0,
    });

    expect(out).toEqual({
      expEventId: 'evt-xyz',
      exp: {
        earnedExp: 75,
        totalExp: 75,
        level: 0,
        levelUp: false,
        progressPercent: 75,
      },
    });
  });

  it('propagates errors thrown inside the transaction (rollback path)', async () => {
    mockGrantPracticeExp.mockRejectedValueOnce(new Error('grant failed'));
    const { saveFreePlayResult } = await import('./save-free-play-result');

    await expect(
      saveFreePlayResult({
        userId: 'user-1',
        menuType: 'position_memory',
        correctCount: 5,
        mistakes: 0,
      })
    ).rejects.toThrow('grant failed');
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});
