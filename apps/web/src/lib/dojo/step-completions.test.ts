import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getCompletedSteps, recordGuideSteps } from './step-completions';

const insertValues = vi.fn();
const onConflictDoNothing = vi.fn();
const selectRows = vi.fn<() => { stepKey: string }[]>();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: (rows: unknown) => {
        insertValues(rows);
        return { onConflictDoNothing: (...args: unknown[]) => onConflictDoNothing(...args) };
      },
    }),
    select: () => ({
      from: () => ({ where: () => ({ orderBy: () => selectRows() }) }),
    }),
  },
  dojoStepCompletions: { userId: 'user_id', stepKey: 'step_key' },
}));

const userId = 'user-1';

describe('recordGuideSteps', () => {
  beforeEach(() => {
    insertValues.mockReset();
    onConflictDoNothing.mockReset();
  });

  it('records valid guide keys and reports them as completed', async () => {
    const result = await recordGuideSteps(userId, ['guide:5kyu:1', 'guide:5kyu:2']);

    expect(result).toEqual({ completed: ['guide:5kyu:1', 'guide:5kyu:2'], rejected: [] });
    expect(insertValues).toHaveBeenCalledWith([
      { userId, stepKey: 'guide:5kyu:1' },
      { userId, stepKey: 'guide:5kyu:2' },
    ]);
  });

  it('rejects exam keys so a client can never report an exam pass', async () => {
    const result = await recordGuideSteps(userId, ['exam:2kyu:puzzle', 'guide:2kyu:1']);

    expect(result).toEqual({ completed: ['guide:2kyu:1'], rejected: ['exam:2kyu:puzzle'] });
    expect(insertValues).toHaveBeenCalledWith([{ userId, stepKey: 'guide:2kyu:1' }]);
  });

  it('rejects every key that is not a guide key, including non-strings', async () => {
    const result = await recordGuideSteps(userId, [
      'guide:9kyu:1',
      'guide:5kyu:0',
      'guide:5kyu:01',
      'challenge:x',
      42,
    ]);

    expect(result).toEqual({
      completed: [],
      rejected: ['guide:9kyu:1', 'guide:5kyu:0', 'guide:5kyu:01', 'challenge:x', '42'],
    });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('is idempotent: resent keys are completed again through onConflictDoNothing', async () => {
    const first = await recordGuideSteps(userId, ['guide:3kyu:4']);
    const second = await recordGuideSteps(userId, ['guide:3kyu:4']);

    expect(second).toEqual(first);
    expect(onConflictDoNothing).toHaveBeenCalledTimes(2);
  });

  it('writes a key repeated in one request once', async () => {
    const result = await recordGuideSteps(userId, ['guide:4kyu:1', 'guide:4kyu:1']);

    expect(result.completed).toEqual(['guide:4kyu:1']);
    expect(insertValues).toHaveBeenCalledWith([{ userId, stepKey: 'guide:4kyu:1' }]);
  });
});

describe('getCompletedSteps', () => {
  it('returns the stored step keys', async () => {
    selectRows.mockReturnValue([{ stepKey: 'exam:2kyu:puzzle' }, { stepKey: 'guide:5kyu:1' }]);

    expect(await getCompletedSteps(userId)).toEqual(['exam:2kyu:puzzle', 'guide:5kyu:1']);
  });
});
