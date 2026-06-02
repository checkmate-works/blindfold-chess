/**
 * Tests for `AiReplyChip` — the on-board AI-reply status chip. Covers the
 * visibility state machine: the thinking spinner, the transient move chip and
 * its auto-fade, and thinking taking priority over a lingering move.
 *
 * `useSafeTranslations` falls through to its key-as-text fallback when no
 * provider is mounted; stubbing it keeps assertions on stable strings.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiReplyChip } from './AiReplyChip';

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

// The chip is always mounted; visibility is conveyed via opacity. Assert on the
// opacity class of the chip element (the parent of the label span).
function chip() {
  return screen.getByText('aiThinking').parentElement!;
}

describe('AiReplyChip', () => {
  it('shows the thinking chip (visible) while the AI is thinking', () => {
    render(<AiReplyChip isAiThinking aiMoveDisplay={null} aiMoveSignal={0} />);
    expect(screen.getByText('aiThinking')).toBeInTheDocument();
    expect(chip().className).toContain('opacity-100');
  });

  it('surfaces the move on a new signal, then fades it out after the delay', () => {
    const { rerender } = render(
      <AiReplyChip isAiThinking={false} aiMoveDisplay="AI played e5" aiMoveSignal={0} />
    );
    // No move announced yet (signal 0) → hidden.
    const el = screen.getByText('AI played e5').parentElement!;
    expect(el.className).toContain('opacity-0');

    // AI plays → signal bumps → chip becomes visible.
    rerender(<AiReplyChip isAiThinking={false} aiMoveDisplay="AI played e5" aiMoveSignal={1} />);
    expect(screen.getByText('AI played e5').parentElement!.className).toContain('opacity-100');

    // After the visible window it fades back out.
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByText('AI played e5').parentElement!.className).toContain('opacity-0');
  });

  it('prioritizes the thinking state over a still-visible move', () => {
    const { rerender } = render(
      <AiReplyChip isAiThinking={false} aiMoveDisplay="AI played e5" aiMoveSignal={1} />
    );
    expect(screen.getByText('AI played e5')).toBeInTheDocument();

    // The AI starts thinking again before the move chip's window elapses.
    rerender(<AiReplyChip isAiThinking aiMoveDisplay="AI played e5" aiMoveSignal={1} />);
    expect(screen.getByText('aiThinking')).toBeInTheDocument();
    expect(screen.queryByText('AI played e5')).not.toBeInTheDocument();
    expect(chip().className).toContain('opacity-100');
  });
});
