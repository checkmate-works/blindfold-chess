// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useChallengeResultSave } from './use-challenge-result-save';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  finishChallengeAttempt: vi.fn(),
  writeSessionItem: vi.fn(),
  stashGrantedRanks: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('../_actions/challenge-attempt', () => ({
  finishChallengeAttempt: mocks.finishChallengeAttempt,
}));

vi.mock('@/lib/storage/session-storage', () => ({
  writeSessionItem: mocks.writeSessionItem,
}));

vi.mock('@/app/[locale]/(public)/practice/_lib/granted-ranks-stash', () => ({
  stashGrantedRanks: mocks.stashGrantedRanks,
}));

vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));

const RESULT_URL = '/en/practice/square-colors/result?score=3';

type Options = Parameters<typeof useChallengeResultSave>[0];

function render(overrides: Partial<Options>) {
  const options: Options = {
    isFinished: true,
    totalAnswers: 5,
    resultUrl: RESULT_URL,
    attemptId: 'a1',
    remoteFailed: false,
    moduleName: 'square_colors',
    ...overrides,
  };
  return renderHook(() => useChallengeResultSave(options));
}

describe('useChallengeResultSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finishes the attempt by id and redirects with the grant id', async () => {
    mocks.finishChallengeAttempt.mockResolvedValue({
      status: 'done',
      success: true,
      grantedRanks: [],
      challengeResultId: 'r1',
    });

    render({});

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(`${RESULT_URL}&grant=r1`));
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledWith('a1');
    expect(mocks.stashGrantedRanks).toHaveBeenCalledWith([]);
  });

  it('waits out a pending finish and sends it again', async () => {
    vi.useFakeTimers();
    mocks.finishChallengeAttempt
      .mockResolvedValueOnce({ status: 'pending', remainingMs: 200 })
      .mockResolvedValueOnce({ status: 'done', success: true, challengeResultId: 'r1' });

    render({});

    await vi.advanceTimersByTimeAsync(299);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(2);
    expect(mocks.push).toHaveBeenCalledWith(`${RESULT_URL}&grant=r1`);
  });

  it('gives up after five resends that are still pending and shows the save error', async () => {
    vi.useFakeTimers();
    mocks.finishChallengeAttempt.mockResolvedValue({ status: 'pending', remainingMs: 0 });

    render({});

    await vi.advanceTimersByTimeAsync(1000);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(6);
    expect(mocks.writeSessionItem).toHaveBeenCalledWith(expect.any(String), 'true');
    expect(mocks.push).toHaveBeenCalledWith(RESULT_URL);
  });

  it('shows the save error when the finish is not recorded', async () => {
    mocks.finishChallengeAttempt.mockResolvedValue({
      status: 'done',
      success: false,
      error: 'not_recorded',
    });

    render({});

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(RESULT_URL));
    expect(mocks.writeSessionItem).toHaveBeenCalledWith(expect.any(String), 'true');
  });

  it('sends a finish that threw again and saves when the resend is answered', async () => {
    vi.useFakeTimers();
    mocks.finishChallengeAttempt
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ status: 'done', success: true, challengeResultId: 'r1' });

    render({});

    await vi.advanceTimersByTimeAsync(499);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(2);
    expect(mocks.push).toHaveBeenCalledWith(`${RESULT_URL}&grant=r1`);
    expect(mocks.writeSessionItem).not.toHaveBeenCalled();
  });

  it('sends a finish the action failed on again', async () => {
    vi.useFakeTimers();
    mocks.finishChallengeAttempt
      .mockResolvedValueOnce({ status: 'done', success: false, error: 'unexpected_error' })
      .mockResolvedValueOnce({ status: 'done', success: true, challengeResultId: 'r1' });

    render({});

    await vi.advanceTimersByTimeAsync(500);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(2);
    expect(mocks.push).toHaveBeenCalledWith(`${RESULT_URL}&grant=r1`);
    expect(mocks.writeSessionItem).not.toHaveBeenCalled();
  });

  it('keeps resending a finish through an outage of several seconds', async () => {
    vi.useFakeTimers();
    mocks.finishChallengeAttempt
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ status: 'done', success: true, challengeResultId: 'r1' });

    render({});

    // Resends after 500, 1000 and 2000 ms: the third lands 3.5 s in.
    await vi.advanceTimersByTimeAsync(3499);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(4);
    expect(mocks.push).toHaveBeenCalledWith(`${RESULT_URL}&grant=r1`);
    expect(mocks.writeSessionItem).not.toHaveBeenCalled();
  });

  it('gives up after five resends of a finish that keeps throwing and shows the save error', async () => {
    vi.useFakeTimers();
    mocks.finishChallengeAttempt.mockRejectedValue(new Error('network'));

    render({});

    await vi.advanceTimersByTimeAsync(15_499);
    expect(mocks.push).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(6);
    expect(mocks.writeSessionItem).toHaveBeenCalledWith(expect.any(String), 'true');
    expect(mocks.push).toHaveBeenCalledWith(RESULT_URL);
  });

  it('does not resend a finish the server decided not to record', async () => {
    vi.useFakeTimers();
    mocks.finishChallengeAttempt.mockResolvedValue({
      status: 'done',
      success: false,
      error: 'not_recorded',
    });

    render({});

    await vi.advanceTimersByTimeAsync(5000);
    expect(mocks.finishChallengeAttempt).toHaveBeenCalledTimes(1);
  });

  it('does not finish a guest run and redirects without an error', async () => {
    render({ attemptId: null });

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(RESULT_URL));
    expect(mocks.finishChallengeAttempt).not.toHaveBeenCalled();
    expect(mocks.writeSessionItem).not.toHaveBeenCalled();
  });

  it('does not finish an aborted run', async () => {
    render({ skipSave: true });

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(RESULT_URL));
    expect(mocks.finishChallengeAttempt).not.toHaveBeenCalled();
    expect(mocks.writeSessionItem).not.toHaveBeenCalled();
  });

  it('does not finish a run that lost the server and shows the save error', async () => {
    // remoteFailed ends the run with reason `quit`, which a screen may also
    // map to skipSave; the failure must still be reported.
    render({ remoteFailed: true, skipSave: true });

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(RESULT_URL));
    expect(mocks.finishChallengeAttempt).not.toHaveBeenCalled();
    expect(mocks.writeSessionItem).toHaveBeenCalledWith(expect.any(String), 'true');
  });

  it('does nothing until the session is finished', () => {
    render({ isFinished: false });

    expect(mocks.finishChallengeAttempt).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
