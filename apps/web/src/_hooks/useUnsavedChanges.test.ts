import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChanges } from './useUnsavedChanges';

const mockAccept = vi.fn();
const mockReject = vi.fn();

vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: (options: { enabled: boolean }) => ({
    active: options.enabled,
    accept: mockAccept,
    reject: mockReject,
  }),
}));

describe('useUnsavedChanges', () => {
  beforeEach(() => {
    mockAccept.mockClear();
    mockReject.mockClear();
  });

  it('should return isBlocking=false when isDirty is false', () => {
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: false }));

    expect(result.current.isBlocking).toBe(false);
  });

  it('should return isBlocking=true when isDirty is true', () => {
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    expect(result.current.isBlocking).toBe(true);
  });

  it('should expose confirm and cancel functions', () => {
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    expect(typeof result.current.confirm).toBe('function');
    expect(typeof result.current.cancel).toBe('function');

    result.current.confirm();
    expect(mockAccept).toHaveBeenCalled();

    result.current.cancel();
    expect(mockReject).toHaveBeenCalled();
  });

  it('should deactivate guard when isDirty changes from true to false', () => {
    const { result, rerender } = renderHook(({ isDirty }) => useUnsavedChanges({ isDirty }), {
      initialProps: { isDirty: true },
    });

    expect(result.current.isBlocking).toBe(true);

    rerender({ isDirty: false });

    expect(result.current.isBlocking).toBe(false);
  });

  it('should activate guard when isDirty changes from false to true', () => {
    const { result, rerender } = renderHook(({ isDirty }) => useUnsavedChanges({ isDirty }), {
      initialProps: { isDirty: false },
    });

    expect(result.current.isBlocking).toBe(false);

    rerender({ isDirty: true });

    expect(result.current.isBlocking).toBe(true);
  });

  it('should not throw on unmount', () => {
    const { unmount } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    expect(() => unmount()).not.toThrow();
  });

  it('should not call accept or reject without explicit invocation', () => {
    renderHook(() => useUnsavedChanges({ isDirty: true }));

    expect(mockAccept).not.toHaveBeenCalled();
    expect(mockReject).not.toHaveBeenCalled();
  });
});
