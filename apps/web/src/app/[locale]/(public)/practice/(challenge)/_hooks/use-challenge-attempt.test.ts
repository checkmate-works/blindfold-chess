// @vitest-environment jsdom
import { StrictMode, createElement } from 'react';
import type { ReactNode } from 'react';

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChallengeAttempt } from './use-challenge-attempt';

const mocks = vi.hoisted(() => ({
  auth: { user: null as { id: string } | null, isLoading: false },
  beginChallengeAttempt: vi.fn(),
  answerChallengeAttempt: vi.fn(),
}));

vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../_actions/challenge-attempt', () => ({
  beginChallengeAttempt: mocks.beginChallengeAttempt,
  answerChallengeAttempt: mocks.answerChallengeAttempt,
}));

vi.mock('@/lib/sentry/capture-error', () => ({ captureError: vi.fn() }));

const SETTINGS = { selectedPiece: 'knight' };

function strictWrapper({ children }: { children: ReactNode }) {
  return createElement(StrictMode, null, children);
}

describe('useChallengeAttempt', () => {
  beforeEach(() => {
    mocks.auth = { user: null, isLoading: false };
    mocks.beginChallengeAttempt.mockReset();
    mocks.answerChallengeAttempt.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('stays loading while the auth state is unresolved and does not start an attempt', () => {
    mocks.auth = { user: null, isLoading: true };
    const { result } = renderHook(() => useChallengeAttempt('route_planner', SETTINGS));

    expect(result.current).toEqual({ status: 'loading' });
    expect(mocks.beginChallengeAttempt).not.toHaveBeenCalled();
  });

  it('lets a guest play on the device without starting an attempt', async () => {
    const { result } = renderHook(() => useChallengeAttempt('route_planner', SETTINGS));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toEqual({ status: 'ready', attemptId: null, remote: undefined });
    expect(mocks.beginChallengeAttempt).not.toHaveBeenCalled();
  });

  it('starts one attempt for a signed-in player, even under Strict Mode double effects', async () => {
    mocks.auth = { user: { id: 'u1' }, isLoading: false };
    mocks.beginChallengeAttempt.mockResolvedValue({
      success: true,
      attemptId: 'a1',
      first: { sequence: 0, question: 'e4' },
    });

    const { result } = renderHook(() => useChallengeAttempt<string>('route_planner', SETTINGS), {
      wrapper: strictWrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.beginChallengeAttempt).toHaveBeenCalledTimes(1);
    expect(mocks.beginChallengeAttempt).toHaveBeenCalledWith('route_planner', SETTINGS);
    const ready = result.current;
    if (ready.status !== 'ready' || ready.attemptId === null) throw new Error('expected attempt');
    expect(ready.attemptId).toBe('a1');
    expect(ready.remote.first).toEqual({ sequence: 0, question: 'e4' });
  });

  it('sends each answer to the attempt it started', async () => {
    mocks.auth = { user: { id: 'u1' }, isLoading: false };
    mocks.beginChallengeAttempt.mockResolvedValue({
      success: true,
      attemptId: 'a1',
      first: { sequence: 0, question: 'e4' },
    });
    mocks.answerChallengeAttempt.mockResolvedValue({ status: 'rejected' });

    const { result } = renderHook(() => useChallengeAttempt<string>('square_colors', {}));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const ready = result.current;
    if (ready.status !== 'ready' || ready.attemptId === null) throw new Error('expected attempt');

    await expect(ready.remote.submitAnswer(0, 'light')).resolves.toEqual({ status: 'rejected' });
    expect(mocks.answerChallengeAttempt).toHaveBeenCalledWith('a1', 0, 'light');
  });

  it('keeps the same port across re-renders so the session talks to one attempt', async () => {
    mocks.auth = { user: { id: 'u1' }, isLoading: false };
    mocks.beginChallengeAttempt.mockResolvedValue({
      success: true,
      attemptId: 'a1',
      first: { sequence: 0, question: 'e4' },
    });

    const { result, rerender } = renderHook(() => useChallengeAttempt('square_colors', {}));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const first = result.current;
    rerender();

    expect(result.current).toBe(first);
    expect(mocks.beginChallengeAttempt).toHaveBeenCalledTimes(1);
  });

  it('reports a failed start as an error with a retry that starts a new attempt', async () => {
    mocks.auth = { user: { id: 'u1' }, isLoading: false };
    mocks.beginChallengeAttempt
      .mockResolvedValueOnce({ success: false, error: 'rate_limited' })
      .mockResolvedValueOnce({
        success: true,
        attemptId: 'a2',
        first: { sequence: 0, question: 'e4' },
      });

    const { result } = renderHook(() => useChallengeAttempt('square_colors', {}));
    await waitFor(() => expect(result.current.status).toBe('error'));

    const failed = result.current;
    if (failed.status !== 'error') throw new Error('expected error');
    act(() => failed.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.beginChallengeAttempt).toHaveBeenCalledTimes(2);
    expect(result.current).toMatchObject({ status: 'ready', attemptId: 'a2' });
  });

  it('tells a start refused by the rate limit apart from any other failed start', async () => {
    mocks.auth = { user: { id: 'u1' }, isLoading: false };
    mocks.beginChallengeAttempt.mockResolvedValue({ success: false, error: 'rateLimited' });

    const { result } = renderHook(() => useChallengeAttempt('route_planner', SETTINGS));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toMatchObject({ reason: 'rateLimited' });
  });

  it('reports any other refused start as a plain failure', async () => {
    mocks.auth = { user: { id: 'u1' }, isLoading: false };
    mocks.beginChallengeAttempt.mockResolvedValue({ success: false, error: 'invalid_settings' });

    const { result } = renderHook(() => useChallengeAttempt('route_planner', SETTINGS));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toMatchObject({ reason: 'failed' });
  });

  it('reports a start that throws (network failure) as an error', async () => {
    mocks.auth = { user: { id: 'u1' }, isLoading: false };
    mocks.beginChallengeAttempt.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useChallengeAttempt('square_colors', {}));

    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
