import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExamSubmission } from './use-exam-submission';

const mockSubmitExamAnswer = vi.fn();
const mockPush = vi.fn();
const mockStash = vi.fn();

vi.mock('../_actions/submitExamAnswer', () => ({
  submitExamAnswer: (...args: unknown[]) => mockSubmitExamAnswer(...args),
}));
vi.mock('@/i18n/routing', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/app/[locale]/(public)/practice/_lib/granted-ranks-stash', () => ({
  stashGrantedRanks: (...args: unknown[]) => mockStash(...args),
}));
vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));

const SOLVING_MOVES = { moves: ['Qg8+', 'Nf7#'] };
const GRANTED_2KYU = { slug: '2kyu', level: 50, color: 'blue' };

function graded(fields: { passed: boolean; recorded: boolean; accuracy?: number | null }) {
  return { success: true, accuracy: null, grantedRanks: [], ...fields };
}

beforeEach(() => {
  mockSubmitExamAnswer.mockReset();
  mockPush.mockReset();
  mockStash.mockReset();
});

describe('useExamSubmission', () => {
  it('sends the raw answer with the rank and problem kind', async () => {
    mockSubmitExamAnswer.mockResolvedValue(graded({ passed: true, recorded: true }));
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit(SOLVING_MOVES));

    expect(result.current.verdict).toEqual({ kind: 'submitting' });
    await waitFor(() => expect(result.current.verdict.kind).toBe('graded'));
    expect(mockSubmitExamAnswer).toHaveBeenCalledWith('2kyu', 'puzzle', SOLVING_MOVES);
  });

  it('shows a recorded pass as passed', async () => {
    mockSubmitExamAnswer.mockResolvedValue(graded({ passed: true, recorded: true }));
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit(SOLVING_MOVES));

    await waitFor(() =>
      expect(result.current.verdict).toEqual({
        kind: 'graded',
        passed: true,
        accuracy: null,
        unrecorded: null,
      })
    );
  });

  it('marks a pass the server did not record as unrecorded for want of the rank below', async () => {
    mockSubmitExamAnswer.mockResolvedValue(graded({ passed: true, recorded: false }));
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit(SOLVING_MOVES));

    await waitFor(() =>
      expect(result.current.verdict).toMatchObject({ passed: true, unrecorded: 'locked' })
    );
  });

  it('shows a fail with its accuracy, without any unrecorded reason', async () => {
    mockSubmitExamAnswer.mockResolvedValue(
      graded({ passed: false, recorded: false, accuracy: 62.5 })
    );
    const { result } = renderHook(() => useExamSubmission('2kyu', 'position_memory'));

    act(() => result.current.submit({ fen: '8/8/8/8/8/8/8/8 w - - 0 1' }));

    await waitFor(() =>
      expect(result.current.verdict).toEqual({
        kind: 'graded',
        passed: false,
        accuracy: 62.5,
        unrecorded: null,
      })
    );
  });

  it('grades a signed-out attempt in the browser with the shared grader', async () => {
    mockSubmitExamAnswer.mockResolvedValue({ error: 'signInRequired' });
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit(SOLVING_MOVES));

    await waitFor(() =>
      expect(result.current.verdict).toEqual({
        kind: 'graded',
        passed: true,
        accuracy: null,
        unrecorded: 'signIn',
      })
    );
  });

  it('fails a wrong signed-out attempt in the browser', async () => {
    mockSubmitExamAnswer.mockResolvedValue({ error: 'signInRequired' });
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit({ moves: ['Qc8+'] }));

    await waitFor(() =>
      expect(result.current.verdict).toMatchObject({ passed: false, unrecorded: 'signIn' })
    );
  });

  it('stashes a granted rank and returns to the problem list, where the modal reads it on mount', async () => {
    mockSubmitExamAnswer.mockResolvedValue({
      ...graded({ passed: true, recorded: true }),
      grantedRanks: [GRANTED_2KYU],
    });
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit(SOLVING_MOVES));

    await waitFor(() => expect(result.current.verdict).toEqual({ kind: 'promoted' }));
    expect(mockStash).toHaveBeenCalledWith([GRANTED_2KYU]);
    expect(mockPush).toHaveBeenCalledWith('/dojo/exams/2kyu');
    expect(mockStash.mock.invocationCallOrder[0]).toBeLessThan(
      mockPush.mock.invocationCallOrder[0]!
    );
  });

  it('reports a refused answer (rate limited) as not recorded', async () => {
    mockSubmitExamAnswer.mockResolvedValue({ error: 'rateLimited' });
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit(SOLVING_MOVES));

    await waitFor(() => expect(result.current.verdict).toEqual({ kind: 'error' }));
  });

  it('reports a failed request as not recorded', async () => {
    mockSubmitExamAnswer.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => result.current.submit(SOLVING_MOVES));

    await waitFor(() => expect(result.current.verdict).toEqual({ kind: 'error' }));
  });

  it('sends once per attempt and again after a reset', async () => {
    mockSubmitExamAnswer.mockResolvedValue(graded({ passed: false, recorded: false }));
    const { result } = renderHook(() => useExamSubmission('2kyu', 'puzzle'));

    act(() => {
      result.current.submit(SOLVING_MOVES);
      result.current.submit(SOLVING_MOVES);
    });
    await waitFor(() => expect(result.current.verdict.kind).toBe('graded'));
    expect(mockSubmitExamAnswer).toHaveBeenCalledTimes(1);

    act(() => result.current.reset());
    expect(result.current.verdict).toEqual({ kind: 'idle' });
    act(() => result.current.submit(SOLVING_MOVES));
    await waitFor(() => expect(mockSubmitExamAnswer).toHaveBeenCalledTimes(2));
  });

  it('settles a quit attempt as failed without sending it', () => {
    const { result } = renderHook(() => useExamSubmission('2kyu', 'position_memory'));

    act(() => result.current.fail());

    expect(result.current.verdict).toMatchObject({ kind: 'graded', passed: false });
    expect(mockSubmitExamAnswer).not.toHaveBeenCalled();
  });
});
