/**
 * Tests for `AiReplyChip` and its `useAiReplyChip` visibility hook:
 *   - the hook's state machine (thinking → active; move → active for a window,
 *     then clears; thinking takes priority);
 *   - the presentational chip's opacity + content per (active, thinking).
 *
 * `useSafeTranslations` falls through to its key-as-text fallback when no
 * provider is mounted; stubbing it keeps assertions on stable strings.
 */
import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiReplyChip, useAiReplyChip } from './AiReplyChip';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

describe('useAiReplyChip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('is active + thinking while the AI is thinking', () => {
    const { result } = renderHook(() => useAiReplyChip({ isAiThinking: true, aiMoveSignal: 0 }));
    expect(result.current).toMatchObject({ active: true, thinking: true });
  });

  it('activates on a new move signal, then clears after the window', () => {
    const { result, rerender } = renderHook(
      ({ signal }) => useAiReplyChip({ isAiThinking: false, aiMoveSignal: signal }),
      { initialProps: { signal: 0 } }
    );
    expect(result.current.active).toBe(false);

    rerender({ signal: 1 });
    expect(result.current).toMatchObject({ active: true, thinking: false });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.active).toBe(false);
  });

  it('dismiss() clears the move announcement immediately (e.g. on board reveal)', () => {
    const { result, rerender } = renderHook(
      ({ signal }) => useAiReplyChip({ isAiThinking: false, aiMoveSignal: signal, durationMs: 0 }),
      { initialProps: { signal: 0 } }
    );

    rerender({ signal: 1 });
    expect(result.current.active).toBe(true);

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.active).toBe(false);
  });

  it('honors a custom duration window', () => {
    const { result, rerender } = renderHook(
      ({ signal }) =>
        useAiReplyChip({ isAiThinking: false, aiMoveSignal: signal, durationMs: 2000 }),
      { initialProps: { signal: 0 } }
    );

    rerender({ signal: 1 });
    expect(result.current.active).toBe(true);

    // Still up just before the custom window elapses...
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.active).toBe(true);

    // ...and gone right after.
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.active).toBe(false);
  });

  it('keeps the move visible indefinitely when durationMs is 0', () => {
    const { result, rerender } = renderHook(
      ({ signal }) => useAiReplyChip({ isAiThinking: false, aiMoveSignal: signal, durationMs: 0 }),
      { initialProps: { signal: 0 } }
    );

    rerender({ signal: 1 });
    expect(result.current.active).toBe(true);

    // No auto-dismiss timer is armed, so the move stays up no matter how much
    // time passes — it only clears when the next reply replaces it.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.active).toBe(true);
  });
});

describe('AiReplyChip (presentational)', () => {
  afterEach(() => cleanup());

  it('shows the thinking label at full opacity when active + thinking', () => {
    render(<AiReplyChip active thinking aiMoveDisplay={null} />);
    const chip = screen.getByText('aiThinking').parentElement!;
    expect(chip.className).toContain('opacity-100');
  });

  it('shows the move label when active and not thinking', () => {
    render(<AiReplyChip active thinking={false} aiMoveDisplay="AI played e5" />);
    const chip = screen.getByText('AI played e5').parentElement!;
    expect(chip.className).toContain('opacity-100');
  });

  it('is faded out (opacity-0) when not active', () => {
    render(<AiReplyChip active={false} thinking={false} aiMoveDisplay="AI played e5" />);
    const chip = screen.getByText('AI played e5').parentElement!;
    expect(chip.className).toContain('opacity-0');
  });
});
