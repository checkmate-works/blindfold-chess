import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const authorizeMobileRequest = vi.fn();
vi.mock('@/lib/mobile-api/auth', () => ({
  authorizeMobileRequest: (...args: unknown[]) => authorizeMobileRequest(...args),
}));
vi.mock('server-only', () => ({}));

// The route reads `RATE_LIMITS` from the real module; importing it loads
// `@/lib/db`, so the database is stubbed as well.
const insertValues = vi.fn();
vi.mock('@/lib/db', () => ({
  db: {
    insert: () => ({
      values: (row: unknown) => {
        insertValues(row);
        return { onConflictDoNothing: () => undefined };
      },
    }),
  },
  dojoStepCompletions: { userId: 'user_id', stepKey: 'step_key' },
}));
vi.mock('@/lib/security/rate-limit', async (importActual) => importActual());

const evaluateRanksAfterCreate = vi.fn();
vi.mock('@/lib/db/rank-evaluation', () => ({
  evaluateRanksAfterCreate: (...args: unknown[]) => evaluateRanksAfterCreate(...args),
}));
const getAchievedSlugsForUser = vi.fn();
vi.mock('@/lib/dojo/rank-queries', () => ({
  getAchievedSlugsForUser: (userId: string) => getAchievedSlugsForUser(userId),
}));

const post = (rank: string, problem: string, body: unknown) =>
  POST(
    new Request(`http://localhost/api/mobile/v1/dojo/exams/${rank}/${problem}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ rank, problem }) }
  );

const puzzleAnswer = { moves: ['Qg8+', 'Nf7#'] };

describe('POST /api/mobile/v1/dojo/exams/[rank]/[problem]', () => {
  beforeEach(() => {
    insertValues.mockReset();
    evaluateRanksAfterCreate.mockReset().mockResolvedValue([]);
    getAchievedSlugsForUser.mockReset().mockResolvedValue(new Set(['5kyu', '4kyu', '3kyu']));
    authorizeMobileRequest.mockReset().mockResolvedValue({ ok: true, user: { id: 'u1' } });
  });

  it('answers 404 unknownExam for a rank without an exam', async () => {
    const response = await post('5kyu', 'puzzle', puzzleAnswer);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'unknownExam' });
    expect(evaluateRanksAfterCreate).not.toHaveBeenCalled();
  });

  it('answers 404 unknownExam for an unknown problem or the snake_case spelling', async () => {
    expect((await post('2kyu', 'riddle', puzzleAnswer)).status).toBe(404);
    expect((await post('2kyu', 'position_memory', { fen: 'x' })).status).toBe(404);
    expect((await post('2kyu', 'constructor', puzzleAnswer)).status).toBe(404);
  });

  it('records a pass as one exam step row for the token user and evaluates ranks', async () => {
    const response = await post('2kyu', 'puzzle', { ...puzzleAnswer, userId: 'someone-else' });

    expect(await response.json()).toEqual({
      passed: true,
      accuracy: null,
      recorded: true,
      grantedRanks: [],
      highestRank: '3kyu',
    });
    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith({ userId: 'u1', stepKey: 'exam:2kyu:puzzle' });
    expect(evaluateRanksAfterCreate).toHaveBeenCalledWith('u1', expect.any(String));
  });

  it('maps the position-memory segment to the position_memory problem', async () => {
    const response = await post('2kyu', 'position-memory', { fen: '8/8/8/8/8/8/8/8 w - - 0 1' });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ passed: false, recorded: false });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('reports the rank the pass earned and the new highest rank', async () => {
    evaluateRanksAfterCreate.mockResolvedValue([{ slug: '2kyu', level: 40, color: 'green' }]);
    getAchievedSlugsForUser
      .mockResolvedValueOnce(new Set(['5kyu', '4kyu', '3kyu']))
      .mockResolvedValueOnce(new Set(['5kyu', '4kyu', '3kyu', '2kyu']));

    const response = await post('2kyu', 'puzzle', puzzleAnswer);

    expect(await response.json()).toMatchObject({ grantedRanks: ['2kyu'], highestRank: '2kyu' });
  });

  it('grades but does not record a pass by a player for whom 2kyu is not the next rank', async () => {
    getAchievedSlugsForUser.mockResolvedValue(new Set(['5kyu']));

    const response = await post('2kyu', 'puzzle', puzzleAnswer);

    expect(await response.json()).toMatchObject({
      passed: true,
      recorded: false,
      highestRank: '5kyu',
    });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('records nothing for a failed answer', async () => {
    const response = await post('2kyu', 'puzzle', { moves: ['Qc8+'] });

    expect(await response.json()).toMatchObject({ passed: false, recorded: false });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it('rate limits with the dojoExam budget', async () => {
    await post('2kyu', 'puzzle', puzzleAnswer);

    expect(authorizeMobileRequest).toHaveBeenCalledWith(expect.any(Request), {
      rateLimit: expect.objectContaining({ action: 'dojo_exam', maxAttempts: 60 }),
    });
  });
});
