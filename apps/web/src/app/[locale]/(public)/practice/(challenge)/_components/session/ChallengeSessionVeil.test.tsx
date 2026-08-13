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

  it('veils the countdown lightly and the pause heavily', () => {
    const { container: counting } = render(
      <ChallengeSessionVeil countdown={3} isPaused={false}>
        <p>content</p>
      </ChallengeSessionVeil>
    );
    // Light enough that the content stays a positional anchor through the reveal.
    expect(veilOf(counting).className).toContain('blur-xs');
    expect(veilOf(counting).className).not.toContain('grayscale');

    const { container: paused } = render(
      <ChallengeSessionVeil countdown={null} isPaused>
        <p>content</p>
      </ChallengeSessionVeil>
    );
    // A paused timer with a readable position is free study time.
    expect(veilOf(paused).className).toContain('blur-md');
    expect(veilOf(paused).className).toContain('grayscale');
  });

  it('applies the pause veil when a session is paused mid-countdown', () => {
    const { container } = render(
      <ChallengeSessionVeil countdown={1} isPaused>
        <p>content</p>
      </ChallengeSessionVeil>
    );

    expect(veilOf(container).className).toContain('blur-md');
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

    // The veil owns the one and only blur; a backdrop filter here composes with
    // it and erases the content underneath.
    expect(screen.getByTestId('countdown-overlay').className).not.toContain('backdrop-blur');
  });
});
