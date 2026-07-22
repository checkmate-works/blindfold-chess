import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useUnsavedChanges } from './useUnsavedChanges';

// The navigation guard is driven externally (route/tab changes). We control
// what it reports so the hook's own logic (in-app discard + merged dialog) is
// the only thing under test.
const guard = { active: false, accept: vi.fn(), reject: vi.fn() };
vi.mock('next-navigation-guard', () => ({
  useNavigationGuard: () => guard,
}));

afterEach(() => {
  guard.active = false;
  guard.accept.mockClear();
  guard.reject.mockClear();
});

describe('useUnsavedChanges', () => {
  it('discards immediately without a dialog when not dirty', () => {
    const onDiscard = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: false, onDiscard }));

    act(() => result.current.requestDiscard());

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(result.current.isBlocking).toBe(false);
  });

  it('opens the dialog on an in-app cancel while dirty, and runs onDiscard on confirm', () => {
    const onDiscard = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true, onDiscard }));

    act(() => result.current.requestDiscard());
    expect(result.current.isBlocking).toBe(true);
    expect(onDiscard).not.toHaveBeenCalled();

    act(() => result.current.confirm());
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(result.current.isBlocking).toBe(false);
  });

  it('closes the dialog without discarding on cancel', () => {
    const onDiscard = vi.fn();
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true, onDiscard }));

    act(() => result.current.requestDiscard());
    act(() => result.current.cancel());

    expect(onDiscard).not.toHaveBeenCalled();
    expect(result.current.isBlocking).toBe(false);
  });

  it('surfaces the navigation guard as the same dialog and forwards accept/reject', () => {
    guard.active = true;
    const { result } = renderHook(() => useUnsavedChanges({ isDirty: true }));

    expect(result.current.isBlocking).toBe(true);

    act(() => result.current.confirm());
    expect(guard.accept).toHaveBeenCalledTimes(1);

    act(() => result.current.cancel());
    expect(guard.reject).toHaveBeenCalledTimes(1);
  });
});
