import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SubmitOutcome } from './useSubmitLifecycle';
import { useSubmitLifecycle } from './useSubmitLifecycle';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@/i18n/routing', () => ({ useRouter: () => ({ push }) }));

type Field = 'name';

const resolveAnchorId = () => 'name-input';

function mount() {
  return renderHook(() => useSubmitLifecycle<Field>(resolveAnchorId));
}

/** A write whose outcome the test decides after observing the in-flight state. */
function deferredWrite() {
  let settle!: (outcome: SubmitOutcome<Field>) => void;
  const promise = new Promise<SubmitOutcome<Field>>((resolve) => {
    settle = resolve;
  });
  return { write: () => promise, settle };
}

beforeEach(() => {
  push.mockReset();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('useSubmitLifecycle', () => {
  it('starts editing, idle, with no rejection', () => {
    const { result } = mount();

    expect(result.current.status).toBe('editing');
    expect(result.current.busy).toBe(false);
    expect(result.current.submitted).toBe(false);
    expect(result.current.confirmOpen).toBe(false);
    expect(result.current.formMessage).toBeNull();
  });

  it('commits `succeeded` before navigating, so the leave guard is already disarmed', async () => {
    const { result } = mount();
    // What a form's dirty flag would read at the moment the redirect starts.
    let submittedAtPush: boolean | undefined;
    push.mockImplementation(() => {
      submittedAtPush = result.current.submitted;
    });

    await act(() => result.current.run(async () => ({ ok: true, href: '/repertoires/r1' })));

    expect(push).toHaveBeenCalledWith('/repertoires/r1');
    expect(submittedAtPush).toBe(true);
    // Still busy: the page stays mounted until the navigation resolves.
    expect(result.current.status).toBe('succeeded');
    expect(result.current.busy).toBe(true);
  });

  it('closes the confirmation and is busy while the write is in flight', async () => {
    const { result } = mount();
    act(() => result.current.requestConfirm());
    expect(result.current.confirmOpen).toBe(true);

    const { write, settle } = deferredWrite();
    let running!: Promise<void>;
    act(() => {
      running = result.current.run(write);
    });

    expect(result.current.status).toBe('submitting');
    expect(result.current.confirmOpen).toBe(false);
    expect(result.current.busy).toBe(true);

    await act(async () => {
      settle({ ok: true, href: '/done' });
      await running;
    });
  });

  it('returns to editing and reports the rejection on failure, without navigating', async () => {
    const input = document.createElement('input');
    input.id = 'name-input';
    document.body.appendChild(input);
    const { result } = mount();

    await act(() =>
      result.current.run(async () => ({ ok: false, field: 'name', message: 'Name is required.' }))
    );

    expect(result.current.status).toBe('editing');
    expect(result.current.busy).toBe(false);
    expect(result.current.submitted).toBe(false);
    expect(result.current.messageFor('name')).toBe('Name is required.');
    expect(document.activeElement).toBe(input);
    expect(push).not.toHaveBeenCalled();
  });

  it('clears the previous rejection as soon as a retry starts', async () => {
    const { result } = mount();
    await act(() =>
      result.current.run(async () => ({ ok: false, field: null, message: 'Server error.' }))
    );
    expect(result.current.formMessage).toBe('Server error.');

    const { write, settle } = deferredWrite();
    let running!: Promise<void>;
    act(() => {
      running = result.current.run(write);
    });

    expect(result.current.formMessage).toBeNull();

    await act(async () => {
      settle({ ok: true, href: '/done' });
      await running;
    });
  });

  it('dismisses the confirmation without writing', () => {
    const { result } = mount();
    act(() => result.current.requestConfirm());
    act(() => result.current.cancelConfirm());

    expect(result.current.status).toBe('editing');
    expect(push).not.toHaveBeenCalled();
  });
});
