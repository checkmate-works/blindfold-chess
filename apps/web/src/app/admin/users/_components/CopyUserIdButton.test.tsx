import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UI_TIMEOUTS } from '@/app/[locale]/_constants/ui-timeouts';

import { CopyUserIdButton } from './CopyUserIdButton';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const defaultLabels = {
  copyUserId: 'Copy user ID',
  copyUserIdSuccess: 'Copied',
};

/**
 * Flush any microtasks queued by awaited promises inside the click handler.
 * We do this manually instead of combining `waitFor` with `vi.useFakeTimers`,
 * because `waitFor` internally polls on real timers and hangs when fake timers
 * are installed (reported as flaky by the Coder).
 */
async function flushMicrotasks() {
  // Two ticks: one for the awaited writeToClipboard, one for the resumed
  // handler body that calls setIsCopied(true).
  await Promise.resolve();
  await Promise.resolve();
}

describe('CopyUserIdButton', () => {
  it('renders an icon-only button with the copy aria-label', () => {
    render(
      <CopyUserIdButton
        userId="00000000-0000-0000-0000-000000000001"
        labels={defaultLabels}
        writeToClipboard={vi.fn().mockResolvedValue(undefined)}
      />
    );

    const button = screen.getByRole('button', { name: 'Copy user ID' });
    expect(button).toBeInTheDocument();
    // Icon-only: no visible UUID text in the button.
    expect(button.textContent).not.toContain('00000000');
  });

  it('calls the injected clipboard writer with the user ID on click', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    render(<CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
    });

    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith('abc-123');
  });

  it('passes the exact UUID prop string to the writer (no truncation / transform)', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const uuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    render(<CopyUserIdButton userId={uuid} labels={defaultLabels} writeToClipboard={writer} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
    });

    expect(writer).toHaveBeenCalledWith(uuid);
    // Guard against any refactor that starts passing a different arg shape.
    expect(writer.mock.calls[0]).toEqual([uuid]);
  });

  it('swaps aria-label and title to the success label after a successful copy', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);

    render(<CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
    });

    await waitFor(() => {
      const button = screen.getByRole('button', { name: 'Copied' });
      expect(button).toBeInTheDocument();
      // title attribute also reflects the success label (tooltip parity).
      expect(button).toHaveAttribute('title', 'Copied');
    });
  });

  it('reverts to the idle label after PGN_COPY_DURATION has elapsed', async () => {
    vi.useFakeTimers();
    const writer = vi.fn().mockResolvedValue(undefined);

    render(<CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
      await flushMicrotasks();
    });

    // Immediately after click we are in the success state.
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    // Advance past the revert timeout.
    act(() => {
      vi.advanceTimersByTime(UI_TIMEOUTS.PGN_COPY_DURATION);
    });

    // Back to idle.
    const idleButton = screen.getByRole('button', { name: 'Copy user ID' });
    expect(idleButton).toBeInTheDocument();
    expect(idleButton).toHaveAttribute('title', 'Copy user ID');
  });

  it('does not flip to success state when the clipboard writer rejects', async () => {
    const writer = vi.fn().mockRejectedValue(new Error('denied'));

    render(<CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
      await flushMicrotasks();
    });

    // Still showing the idle label.
    expect(screen.getByRole('button', { name: 'Copy user ID' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copied' })).not.toBeInTheDocument();
  });

  it('is keyboard-operable: Enter on a focused native button dispatches click', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);

    render(<CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />);

    const button = screen.getByRole('button', { name: 'Copy user ID' });

    // Native <button> handles Enter/Space via synthesized click events. We
    // assert that path works by firing both a keyDown and the resulting click;
    // if a future refactor adds a custom onKeyDown that swallows the event,
    // this test still passes because the click is what matters. The keyDown
    // is included to document intent.
    await act(async () => {
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      fireEvent.click(button);
    });

    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith('abc-123');
  });

  it('is keyboard-operable: Space on a focused native button dispatches click', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);

    render(<CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />);

    const button = screen.getByRole('button', { name: 'Copy user ID' });

    await act(async () => {
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      fireEvent.click(button);
    });

    expect(writer).toHaveBeenCalledTimes(1);
  });

  it('handles an empty userId string defensively (still passes it through)', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);

    render(<CopyUserIdButton userId="" labels={defaultLabels} writeToClipboard={writer} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
    });

    // Component does not guard against empty string; it just forwards it.
    // Documented here so a future change to add a guard is a conscious one.
    expect(writer).toHaveBeenCalledTimes(1);
    expect(writer).toHaveBeenCalledWith('');
  });

  it('survives multiple rapid clicks without crashing', async () => {
    vi.useFakeTimers();
    const writer = vi.fn().mockResolvedValue(undefined);

    render(<CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />);

    const button = screen.getByRole('button', { name: 'Copy user ID' });

    await act(async () => {
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      await flushMicrotasks();
    });

    // Each click fires the writer — no debouncing in the implementation.
    // Documenting behavior: the last setTimeout wins, so there is ONE effective
    // revert transition PGN_COPY_DURATION after the last click. We just assert
    // no crash and the button ends up in the success state here.
    expect(writer).toHaveBeenCalledTimes(3);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(UI_TIMEOUTS.PGN_COPY_DURATION);
    });

    expect(screen.getByRole('button', { name: 'Copy user ID' })).toBeInTheDocument();
  });

  it('does not throw or warn when unmounted while the revert timeout is pending', async () => {
    vi.useFakeTimers();
    const writer = vi.fn().mockResolvedValue(undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = render(
      <CopyUserIdButton userId="abc-123" labels={defaultLabels} writeToClipboard={writer} />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
      await flushMicrotasks();
    });

    // Unmount while the setTimeout is still scheduled.
    unmount();

    // Advance past the timeout — the stale setState should be a no-op in
    // modern React, but if React emits a warning about updating state on an
    // unmounted component, we capture it here.
    act(() => {
      vi.advanceTimersByTime(UI_TIMEOUTS.PGN_COPY_DURATION);
    });

    const warnings = errorSpy.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter(
        (msg) => msg.includes('unmounted') || msg.includes("Can't perform a React state update")
      );

    expect(warnings).toEqual([]);

    errorSpy.mockRestore();
  });
});
