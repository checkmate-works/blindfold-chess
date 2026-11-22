import { beforeEach, describe, expect, it, vi } from 'vitest';

import { savePuzzleResultForUser } from './puzzle-result';

vi.mock('server-only', () => ({}));
const saveFreePlayResult = vi.fn();
vi.mock('@/lib/db/save-free-play-result', () => ({
  saveFreePlayResult: (input: unknown) => saveFreePlayResult(input),
}));

const save = (playerMoveCount: number, incorrectAttempts = 0, peekCount = 0) =>
  savePuzzleResultForUser('user-1', { playerMoveCount, incorrectAttempts, peekCount });

const recorded = () => saveFreePlayResult.mock.calls.at(-1)?.[0];

describe('savePuzzleResultForUser', () => {
  beforeEach(() => {
    saveFreePlayResult.mockReset().mockResolvedValue({ expEventId: 'exp-1' });
  });

  it('caps a reported move count above the longest allowed solution at 20 moves', async () => {
    await expect(save(1e9)).resolves.toEqual({ expEventId: 'exp-1' });
    expect(recorded()).toEqual({
      userId: 'user-1',
      menuType: 'puzzle',
      correctCount: 20,
      mistakes: 0,
    });

    await save(21);
    expect(recorded()).toMatchObject({ correctCount: 20 });
    await save(20);
    expect(recorded()).toMatchObject({ correctCount: 20 });
  });

  it('caps the penalty counts so their sum cannot overflow', async () => {
    await save(3, 1e9, 1e9);
    expect(recorded()).toMatchObject({ correctCount: 3, mistakes: 2000 });
  });

  it('records nothing for a run with no player move', async () => {
    await expect(save(0, 2, 1)).resolves.toEqual({});
    await expect(save(0.4)).resolves.toEqual({});
    expect(saveFreePlayResult).not.toHaveBeenCalled();
  });

  it('clamps negative counts to zero and rounds fractional counts as before', async () => {
    await expect(save(-5)).resolves.toEqual({});
    expect(saveFreePlayResult).not.toHaveBeenCalled();

    await save(2.5, -3, 1.4);
    expect(recorded()).toMatchObject({ correctCount: 3, mistakes: 1 });
    await save(4.4, 0.5, -1);
    expect(recorded()).toMatchObject({ correctCount: 4, mistakes: 1 });
  });

  it('treats a non-finite count as zero', async () => {
    await expect(save(Number.NaN)).resolves.toEqual({});
    await expect(save(Number.POSITIVE_INFINITY)).resolves.toEqual({});
    expect(saveFreePlayResult).not.toHaveBeenCalled();
  });
});
