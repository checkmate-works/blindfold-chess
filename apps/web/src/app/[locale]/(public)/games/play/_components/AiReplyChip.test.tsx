/**
 * Tests for `AiReplyChip` and its `useAiReplyChip` visibility hook:
 *   - the hook's state machine (thinking → active; move → active for a window,
 *     then clears; thinking takes priority);
 *   - the presentational chip's opacity + content per (active, thinking).
 *
 * `useSafeTranslations` falls through to its key-as-text fallback when no
 * provider is mounted; stubbing it keeps assertions on stable strings.
 */
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiReplyChip, useAiReplyChip } from './AiReplyChip';

vi.mock('@/i18n/use-safe-translations', () => {
  // Minimal t with the `.rich` subset AiReplyChip uses. `.rich` renders the
  // move through the caller's `b` chunk fn (the <strong> wrapper), so tests can
  // assert the notation is bolded.
  const t = (key: string) => key;
  t.rich = (_key: string, values: { move: string; b: (chunks: string) => unknown }) =>
    values.b(values.move);
  return { useSafeTranslations: () => t };
});

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

  it('does not re-show a dismissed move when only durationMs changes (settings edit)', () => {
    const { result, rerender } = renderHook(
      ({ signal, durationMs }) =>
        useAiReplyChip({ isAiThinking: false, aiMoveSignal: signal, durationMs }),
      { initialProps: { signal: 1, durationMs: 0 } }
    );
    expect(result.current.active).toBe(true);

    // Player reveals the board → the announcement is dismissed.
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.active).toBe(false);

    // Changing the AI-display-time setting must NOT bring the dismissed move
    // back over the (now visible) board.
    rerender({ signal: 1, durationMs: 5000 });
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
  it('shows the thinking label at full opacity when active + thinking', () => {
    const { container } = render(<AiReplyChip active thinking aiMoveNotation={null} />);
    expect(screen.getByText('aiThinking')).toBeInTheDocument();
    expect((container.firstChild as HTMLElement).className).toContain('opacity-100');
  });

  it('renders the move notation in bold when active and not thinking', () => {
    const { container } = render(<AiReplyChip active thinking={false} aiMoveNotation="1. e5" />);
    const move = screen.getByText('1. e5');
    expect(move.tagName).toBe('STRONG');
    expect((container.firstChild as HTMLElement).className).toContain('opacity-100');
  });

  it('is faded out (opacity-0) when not active', () => {
    const { container } = render(
      <AiReplyChip active={false} thinking={false} aiMoveNotation="1. e5" />
    );
    expect((container.firstChild as HTMLElement).className).toContain('opacity-0');
  });
});
