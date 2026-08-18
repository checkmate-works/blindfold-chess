// @vitest-environment jsdom
import * as matchers from '@testing-library/jest-dom/matchers';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthGuard } from './use-auth-guard';

expect.extend(matchers);

const mockUseAuth = vi.fn();

vi.mock('../_contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('useAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('isModalOpen should be false initially', () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.isModalOpen).toBe(false);
    });
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });
    });

    it('guardAction should execute the callback immediately', () => {
      const { result } = renderHook(() => useAuthGuard());
      const callback = vi.fn();

      act(() => {
        result.current.guardAction(callback);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('guardAction should not open the modal', () => {
      const { result } = renderHook(() => useAuthGuard());
      const callback = vi.fn();

      act(() => {
        result.current.guardAction(callback);
      });

      expect(result.current.isModalOpen).toBe(false);
    });

    it('guardAction should execute callback on multiple calls', () => {
      const { result } = renderHook(() => useAuthGuard());
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      act(() => {
        result.current.guardAction(callback1);
      });
      act(() => {
        result.current.guardAction(callback2);
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  describe('when user is NOT authenticated', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null });
    });

    it('guardAction should NOT execute the callback', () => {
      const { result } = renderHook(() => useAuthGuard());
      const callback = vi.fn();

      act(() => {
        result.current.guardAction(callback);
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('guardAction should set isModalOpen to true', () => {
      const { result } = renderHook(() => useAuthGuard());

      act(() => {
        result.current.guardAction(vi.fn());
      });

      expect(result.current.isModalOpen).toBe(true);
    });

    it('guardAction should open modal on each call when modal was closed', () => {
      const { result } = renderHook(() => useAuthGuard());

      act(() => {
        result.current.guardAction(vi.fn());
      });
      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.closeModal();
      });
      expect(result.current.isModalOpen).toBe(false);

      act(() => {
        result.current.guardAction(vi.fn());
      });
      expect(result.current.isModalOpen).toBe(true);
    });
  });

  describe('closeModal', () => {
    it('should set isModalOpen back to false', () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useAuthGuard());

      act(() => {
        result.current.guardAction(vi.fn());
      });
      expect(result.current.isModalOpen).toBe(true);

      act(() => {
        result.current.closeModal();
      });
      expect(result.current.isModalOpen).toBe(false);
    });

    it('should be safe to call when modal is already closed', () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useAuthGuard());

      expect(result.current.isModalOpen).toBe(false);

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isModalOpen).toBe(false);
    });
  });

  describe('auth state transitions', () => {
    it('should execute callback after user logs in', () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result, rerender } = renderHook(() => useAuthGuard());
      const callback = vi.fn();

      act(() => {
        result.current.guardAction(callback);
      });
      expect(callback).not.toHaveBeenCalled();
      expect(result.current.isModalOpen).toBe(true);

      // User logs in
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });
      rerender();

      const callbackAfterLogin = vi.fn();
      act(() => {
        result.current.guardAction(callbackAfterLogin);
      });
      expect(callbackAfterLogin).toHaveBeenCalledTimes(1);
    });

    it('should block callback after user logs out', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
      });

      const { result, rerender } = renderHook(() => useAuthGuard());

      const callback1 = vi.fn();
      act(() => {
        result.current.guardAction(callback1);
      });
      expect(callback1).toHaveBeenCalledTimes(1);

      // User logs out
      mockUseAuth.mockReturnValue({ user: null });
      rerender();

      const callback2 = vi.fn();
      act(() => {
        result.current.guardAction(callback2);
      });
      expect(callback2).not.toHaveBeenCalled();
      expect(result.current.isModalOpen).toBe(true);
    });
  });
});
