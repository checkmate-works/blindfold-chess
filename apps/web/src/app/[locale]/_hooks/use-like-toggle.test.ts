// @vitest-environment jsdom
import * as matchers from '@testing-library/jest-dom/matchers';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useLikeToggle } from './use-like-toggle';

expect.extend(matchers);

vi.mock('../_contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@example.com' } }),
}));

describe('useLikeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts from the initial like state', () => {
    const { result } = renderHook(() =>
      useLikeToggle({ initialLikeCount: 3, initialLikedByMe: false, onToggle: vi.fn() })
    );

    expect(result.current.liked).toBe(false);
    expect(result.current.count).toBe(3);
  });

  it('reconciles with the server-confirmed liked/count after a successful toggle', async () => {
    const onToggle = vi.fn().mockResolvedValue({ liked: true, likeCount: 4 });
    const { result } = renderHook(() =>
      useLikeToggle({ initialLikeCount: 3, initialLikedByMe: false, onToggle })
    );

    act(() => {
      result.current.toggle();
    });

    await waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.liked).toBe(true));
    expect(result.current.count).toBe(4);
  });

  it('rolls back to the initial state when the server reports an error', async () => {
    const onToggle = vi.fn().mockResolvedValue({ error: 'nope' });
    const { result } = renderHook(() =>
      useLikeToggle({ initialLikeCount: 3, initialLikedByMe: false, onToggle })
    );

    act(() => {
      result.current.toggle();
    });

    await waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.liked).toBe(false));
    expect(result.current.count).toBe(3);
  });

  it('rolls back to the initial state on a rejected promise (network error)', async () => {
    const onToggle = vi.fn().mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() =>
      useLikeToggle({ initialLikeCount: 3, initialLikedByMe: false, onToggle })
    );

    act(() => {
      result.current.toggle();
    });

    await waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.liked).toBe(false));
    expect(result.current.count).toBe(3);
  });
});
