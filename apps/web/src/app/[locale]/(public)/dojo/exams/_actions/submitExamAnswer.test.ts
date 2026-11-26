/**
 * `submitExamAnswer` is the web's gate in front of `submitExamProblem`: it
 * authenticates, hands the raw answer over for grading, and runs the rank
 * evaluation only when a pass was recorded.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authenticateAndGuard as mockAuthenticateAndGuard } from '@/lib/__mocks__/auth';
import { actualDbSchema } from '@/lib/db/__test-support__/schema-actual';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

const mockSubmitExamProblem = vi.fn();
const mockEvaluateRanks = vi.fn();

vi.mock('@/lib/auth');
vi.mock('@/lib/security/rate-limit');
// The rate-limit mock re-exports the real config through `importActual`,
// which loads `@/lib/db`; stub the client so no connection is attempted.
vi.mock('@/lib/db', async () => ({ ...(await actualDbSchema()), db: {} }));
vi.mock('@/lib/dojo/exam', () => ({
  submitExamProblem: (...args: unknown[]) => mockSubmitExamProblem(...args),
}));
vi.mock('@/lib/db/rank-grant-flow', () => ({
  evaluateRanksAndRefreshEntitlements: (...args: unknown[]) => mockEvaluateRanks(...args),
}));

const USER_ID = 'user-00000000-0000-0000-0000-000000000001';
const GRANTED_2KYU = { slug: '2kyu', level: 50, color: 'blue' };

const { submitExamAnswer } = await import('./submitExamAnswer');

describe('submitExamAnswer', () => {
  beforeEach(() => {
    mockAuthenticateAndGuard.mockReset();
    mockSubmitExamProblem.mockReset();
    mockEvaluateRanks.mockReset();
    mockAuthenticateAndGuard.mockResolvedValue({ user: { id: USER_ID } });
    mockEvaluateRanks.mockResolvedValue([]);
  });

  it('answers signInRequired to a signed-out player without grading or recording', async () => {
    mockAuthenticateAndGuard.mockResolvedValue({ error: 'signInRequired' });

    const result = await submitExamAnswer('2kyu', 'puzzle', { moves: ['Qg8+', 'Nf7#'] });

    expect(result).toEqual({ error: 'signInRequired' });
    expect(mockSubmitExamProblem).not.toHaveBeenCalled();
    expect(mockEvaluateRanks).not.toHaveBeenCalled();
  });

  it('charges the dojo exam rate limit', async () => {
    mockSubmitExamProblem.mockResolvedValue({
      status: 'graded',
      passed: false,
      accuracy: null,
      recorded: false,
    });

    await submitExamAnswer('2kyu', 'puzzle', { moves: ['Qc8'] });

    expect(mockAuthenticateAndGuard).toHaveBeenCalledWith(RATE_LIMITS.dojoExam);
  });

  it('passes the raw answer through to the server-side grader', async () => {
    mockSubmitExamProblem.mockResolvedValue({
      status: 'graded',
      passed: false,
      accuracy: 42.5,
      recorded: false,
    });
    const answer = { fen: '8/8/8/8/8/8/8/8 w - - 0 1' };

    await submitExamAnswer('2kyu', 'position_memory', answer);

    expect(mockSubmitExamProblem).toHaveBeenCalledWith(USER_ID, '2kyu', 'position_memory', answer);
  });

  it('reports a fail without running the rank evaluation', async () => {
    mockSubmitExamProblem.mockResolvedValue({
      status: 'graded',
      passed: false,
      accuracy: 42.5,
      recorded: false,
    });

    const result = await submitExamAnswer('2kyu', 'position_memory', { fen: 'x' });

    expect(result).toEqual({
      success: true,
      passed: false,
      accuracy: 42.5,
      recorded: false,
      grantedRanks: [],
    });
    expect(mockEvaluateRanks).not.toHaveBeenCalled();
  });

  it('reports an unrecorded pass (player not on that rank yet) without running the rank evaluation', async () => {
    mockSubmitExamProblem.mockResolvedValue({
      status: 'graded',
      passed: true,
      accuracy: null,
      recorded: false,
    });

    const result = await submitExamAnswer('2kyu', 'puzzle', { moves: ['Qg8+', 'Nf7#'] });

    expect(result).toMatchObject({
      success: true,
      passed: true,
      recorded: false,
      grantedRanks: [],
    });
    expect(mockEvaluateRanks).not.toHaveBeenCalled();
  });

  it('records the first problem of the exam and grants nothing yet', async () => {
    mockSubmitExamProblem.mockResolvedValue({
      status: 'graded',
      passed: true,
      accuracy: 90.625,
      recorded: true,
    });

    const result = await submitExamAnswer('2kyu', 'position_memory', { fen: 'x' });

    expect(mockEvaluateRanks).toHaveBeenCalledWith(USER_ID, 'dojo exam');
    expect(result).toEqual({
      success: true,
      passed: true,
      accuracy: 90.625,
      recorded: true,
      grantedRanks: [],
    });
  });

  it('returns the rank the evaluation grants once the second problem is recorded', async () => {
    mockSubmitExamProblem.mockResolvedValue({
      status: 'graded',
      passed: true,
      accuracy: null,
      recorded: true,
    });
    mockEvaluateRanks.mockResolvedValue([GRANTED_2KYU]);

    const result = await submitExamAnswer('2kyu', 'puzzle', { moves: ['Qg8+', 'Nf7#'] });

    expect(result).toEqual({
      success: true,
      passed: true,
      accuracy: null,
      recorded: true,
      grantedRanks: [GRANTED_2KYU],
    });
  });

  it('answers unknownExam for a rank or problem with no exam', async () => {
    mockSubmitExamProblem.mockResolvedValue({ status: 'unknownExam' });

    const result = await submitExamAnswer('5kyu', 'puzzle', { moves: [] });

    expect(result).toEqual({ error: 'unknownExam' });
    expect(mockEvaluateRanks).not.toHaveBeenCalled();
  });
});
