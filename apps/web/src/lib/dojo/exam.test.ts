import { DOJO_EXAMS } from '@blindfold-chess/features/dojo-journey';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { submitExamProblem } from './exam';

const insertValues = vi.fn();
const onConflictDoNothing = vi.fn();
const getAchievedSlugsForUser = vi.fn<(userId: string) => Promise<ReadonlySet<string>>>();

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: (row: unknown) => {
        insertValues(row);
        return { onConflictDoNothing: (...args: unknown[]) => onConflictDoNothing(...args) };
      },
    }),
  },
  dojoStepCompletions: { userId: 'user_id', stepKey: 'step_key' },
}));
vi.mock('@/lib/dojo/rank-queries', () => ({
  getAchievedSlugsForUser: (userId: string) => getAchievedSlugsForUser(userId),
}));

const userId = 'user-1';
const memoryFen = (() => {
  const problem = DOJO_EXAMS['2kyu']?.position_memory;
  if (!problem) throw new Error('2kyu has no position_memory problem');
  return problem.fen;
})();
const puzzleAnswer = { moves: ['Qg8+', 'Nf7#'] };

describe('submitExamProblem', () => {
  beforeEach(() => {
    insertValues.mockReset();
    onConflictDoNothing.mockReset();
    getAchievedSlugsForUser.mockReset().mockResolvedValue(new Set(['5kyu', '4kyu', '3kyu']));
  });

  it('answers unknownExam for a rank with no exam or an unknown problem', async () => {
    expect(await submitExamProblem(userId, '5kyu', 'puzzle', puzzleAnswer)).toEqual({
      status: 'unknownExam',
    });
    expect(await submitExamProblem(userId, '2kyu', 'riddle', puzzleAnswer)).toEqual({
      status: 'unknownExam',
    });
    expect(await submitExamProblem(userId, 'mukyu', 'puzzle', puzzleAnswer)).toEqual({
      status: 'unknownExam',
    });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('writes exactly one exam step row for a pass by a player whose next rank is the exam', async () => {
    const result = await submitExamProblem(userId, '2kyu', 'puzzle', puzzleAnswer);

    expect(result).toEqual({ status: 'graded', passed: true, accuracy: null, recorded: true });
    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith({ userId, stepKey: 'exam:2kyu:puzzle' });
    expect(onConflictDoNothing).toHaveBeenCalledTimes(1);
  });

  it('records a memory pass with its accuracy', async () => {
    const result = await submitExamProblem(userId, '2kyu', 'position_memory', { fen: memoryFen });

    expect(result).toMatchObject({ status: 'graded', passed: true, recorded: true });
    expect(result.status === 'graded' && result.accuracy).toBe(100);
    expect(insertValues).toHaveBeenCalledWith({ userId, stepKey: 'exam:2kyu:position_memory' });
  });

  it('records nothing for a failed answer', async () => {
    const result = await submitExamProblem(userId, '2kyu', 'puzzle', { moves: ['Qc8+'] });

    expect(result).toEqual({ status: 'graded', passed: false, accuracy: null, recorded: false });
    expect(insertValues).not.toHaveBeenCalled();
    expect(getAchievedSlugsForUser).not.toHaveBeenCalled();
  });

  it('records nothing for an answer of the wrong shape', async () => {
    const result = await submitExamProblem(userId, '2kyu', 'position_memory', 'not an answer');

    expect(result).toMatchObject({ status: 'graded', passed: false, recorded: false });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('grades but does not record a pass by a player for whom the exam is not the next rank', async () => {
    getAchievedSlugsForUser.mockResolvedValue(new Set(['5kyu']));

    const result = await submitExamProblem(userId, '2kyu', 'puzzle', puzzleAnswer);

    expect(result).toEqual({ status: 'graded', passed: true, accuracy: null, recorded: false });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('grades but does not record a pass by a player with no rank', async () => {
    getAchievedSlugsForUser.mockResolvedValue(new Set());

    const result = await submitExamProblem(userId, '2kyu', 'puzzle', puzzleAnswer);

    expect(result).toMatchObject({ passed: true, recorded: false });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('records a pass by a player who already holds the exam rank', async () => {
    getAchievedSlugsForUser.mockResolvedValue(new Set(['2kyu']));

    const result = await submitExamProblem(userId, '2kyu', 'puzzle', puzzleAnswer);

    expect(result).toMatchObject({ passed: true, recorded: true });
    expect(insertValues).toHaveBeenCalledTimes(1);
  });

  it('judges eligibility by the highest rank held, even when lower ranks are missing', async () => {
    getAchievedSlugsForUser.mockResolvedValue(new Set(['3kyu']));

    const result = await submitExamProblem(userId, '2kyu', 'puzzle', puzzleAnswer);

    expect(result).toMatchObject({ passed: true, recorded: true });
  });
});
