/**
 * Tests for `AiMovePulse`'s pulse-firing logic, with focus on the
 * `enabled` toggle added for always-visible mode where the
 * peripheral-vision flash is redundant.
 *
 * The Web Animations API stub in `vitest.setup.ts` lets us spy on
 * `Element.prototype.animate` to verify when a pulse actually fires.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AiMovePulse } from './AiMovePulse';

describe('AiMovePulse', () => {
  let animateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    animateSpy = vi.spyOn(Element.prototype, 'animate');
  });

  afterEach(() => {
    cleanup();
    animateSpy.mockRestore();
  });

  it('does not fire a pulse on the initial mount', () => {
    render(<AiMovePulse signal={0} />);
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('fires a pulse when the signal increments', () => {
    const { rerender } = render(<AiMovePulse signal={0} />);
    rerender(<AiMovePulse signal={1} />);
    expect(animateSpy).toHaveBeenCalledTimes(1);
  });

  it('does not fire a pulse when enabled=false even if the signal changes', () => {
    const { rerender } = render(<AiMovePulse signal={0} enabled={false} />);
    rerender(<AiMovePulse signal={1} enabled={false} />);
    rerender(<AiMovePulse signal={2} enabled={false} />);
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('does not replay accumulated signals when enabled flips from false to true', () => {
    const { rerender } = render(<AiMovePulse signal={0} enabled={false} />);
    // Advance the signal a few times while disabled.
    rerender(<AiMovePulse signal={1} enabled={false} />);
    rerender(<AiMovePulse signal={2} enabled={false} />);
    rerender(<AiMovePulse signal={3} enabled={false} />);

    // Enable without a fresh signal change — must NOT animate retroactively.
    rerender(<AiMovePulse signal={3} enabled={true} />);
    expect(animateSpy).not.toHaveBeenCalled();

    // A genuine subsequent signal change then animates once.
    rerender(<AiMovePulse signal={4} enabled={true} />);
    expect(animateSpy).toHaveBeenCalledTimes(1);
  });

  it('fires only once per signal increment, not on every rerender', () => {
    const { rerender } = render(<AiMovePulse signal={0} />);
    rerender(<AiMovePulse signal={1} />);
    rerender(<AiMovePulse signal={1} />); // same signal — no second pulse
    rerender(<AiMovePulse signal={1} />);
    expect(animateSpy).toHaveBeenCalledTimes(1);
  });
});
