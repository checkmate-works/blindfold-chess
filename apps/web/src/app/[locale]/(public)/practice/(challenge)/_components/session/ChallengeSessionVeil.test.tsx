import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChallengeSessionVeil } from './ChallengeSessionVeil';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock('@/i18n/use-safe-translations', () => ({
  useSafeTranslations: () => (key: string) => key,
}));

/**
 * These assertions encode the three properties the veil was consolidated to
 * guarantee. Each one had already regressed independently across the seven
 * hand-rolled copies this component replaced, so they are pinned rather than
 * left to review.
 */
describe('ChallengeSessionVeil', () => {
  const veilOf = (container: HTMLElement) =>
    container.querySelector(':scope > div > div:last-of-type') as HTMLElement;

  it('does not animate the veil, so it cannot outlive the curtain that unmounts in one frame', () => {
    const { container } = render(
      <ChallengeSessionVeil countdown={2} isPaused={false}>
        <p>content</p>
      </ChallengeSessionVeil>
    );

    // A `transition` here resolves for 300ms after `BoardOverlay` has already
    // returned null — a trailing blur that reads as a layout shift.
    expect(veilOf(container).className).not.toMatch(/transition|duration/);
  });

  // The countdown is the one that looks decorative and is not: the first
  // question is already mounted behind it, so a legible question during
  // "3 · 2 · 1" is a head start on a timed run. Both curtains hide to the same
  // bar, and all three parts are load-bearing — dropping any one of them puts
  // the question back on screen.
  it.each([
    ['counting down', 3, false],
    ['paused', null, true],
    ['paused mid-countdown', 1, true],
  ])('hides the question while %s', (_label, countdown, isPaused) => {
    const { container } = render(
      <ChallengeSessionVeil countdown={countdown} isPaused={isPaused}>
        <p>content</p>
      </ChallengeSessionVeil>
    );

    expect(veilOf(container).className).toContain('blur-md');
    expect(veilOf(container).className).toContain('grayscale');
    expect(veilOf(container).className).toContain('opacity-50');
  });

  it('leaves the content unveiled once neither curtain is up', () => {
    const { container } = render(
      <ChallengeSessionVeil countdown={null} isPaused={false}>
        <p>content</p>
      </ChallengeSessionVeil>
    );

    expect(veilOf(container).className).toBe('');
  });

  it('lets the countdown curtain blur nothing of its own', () => {
    render(
      <ChallengeSessionVeil countdown={0} isPaused={false}>
        <p>content</p>
      </ChallengeSessionVeil>
    );

    // Hiding is the veil's single responsibility. A backdrop filter here splits
    // it across two components, which is how three sessions ended up relying on
    // this one instead of the veil and drifting out of sync with it.
    expect(screen.getByTestId('countdown-overlay').className).not.toContain('backdrop-blur');
  });
});
