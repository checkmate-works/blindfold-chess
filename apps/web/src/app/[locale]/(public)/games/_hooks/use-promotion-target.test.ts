// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.fn();
const mockGetPublishPromotionTarget = vi.fn();

vi.mock('@/app/[locale]/_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/app/[locale]/(public)/dojo/ranks/_actions/getPublishPromotionTarget', () => ({
  getPublishPromotionTarget: (...args: unknown[]) => mockGetPublishPromotionTarget(...args),
}));

const { usePromotionTarget } = await import('./use-promotion-target');

afterEach(() => {
  cleanup();
});

describe('usePromotionTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call the server and returns null when signed out', () => {
    mockUseAuth.mockReturnValue({ user: null, hasProfile: false, isLoading: false });

    const { result } = renderHook(() => usePromotionTarget('1kyu'));

    expect(result.current).toBeNull();
    expect(mockGetPublishPromotionTarget).not.toHaveBeenCalled();
  });

  it('does not call the server while auth is still loading', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, hasProfile: true, isLoading: true });

    const { result } = renderHook(() => usePromotionTarget('1kyu'));

    expect(result.current).toBeNull();
    expect(mockGetPublishPromotionTarget).not.toHaveBeenCalled();
  });

  it('does not call the server for a provisional user (no profile)', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, hasProfile: false, isLoading: false });

    const { result } = renderHook(() => usePromotionTarget('1kyu'));

    expect(result.current).toBeNull();
    expect(mockGetPublishPromotionTarget).not.toHaveBeenCalled();
  });

  it('resolves the server-confirmed rank for a confirmed signed-in user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, hasProfile: true, isLoading: false });
    mockGetPublishPromotionTarget.mockResolvedValue('1kyu');

    const { result } = renderHook(() => usePromotionTarget('1kyu'));

    await waitFor(() => expect(result.current).toBe('1kyu'));
    expect(mockGetPublishPromotionTarget).toHaveBeenCalledWith('1kyu');
  });

  it('resets to null immediately when the qualification input changes, instead of showing the stale rank', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, hasProfile: true, isLoading: false });

    let resolveFirst: (rank: string | null) => void = () => {};
    mockGetPublishPromotionTarget.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      })
    );

    const { result, rerender } = renderHook(
      ({ qualification }) => usePromotionTarget(qualification),
      { initialProps: { qualification: '1kyu' as '1kyu' | '1dan' } }
    );

    expect(result.current).toBeNull();

    await act(async () => {
      resolveFirst('1kyu');
    });
    await waitFor(() => expect(result.current).toBe('1kyu'));

    // Input changes before the new fetch resolves — must show null, never
    // the previous qualification's resolved rank.
    let resolveSecond: (rank: string | null) => void = () => {};
    mockGetPublishPromotionTarget.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSecond = resolve;
      })
    );
    rerender({ qualification: '1dan' });

    expect(result.current).toBeNull();

    await act(async () => {
      resolveSecond('1dan');
    });
    await waitFor(() => expect(result.current).toBe('1dan'));
  });
});
