import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

// jsdom implements neither `matchMedia` nor `Element.animate`. Components
// that gate on `prefers-reduced-motion` and drive the Web Animations API
// (AiMovePulse, the move-input shake, ...) call both; stub them so those
// code paths run under test instead of throwing. Real browsers have both.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

if (!Element.prototype.animate) {
  Element.prototype.animate = (() =>
    ({
      cancel: () => {},
      finish: () => {},
      play: () => {},
      pause: () => {},
      reverse: () => {},
      finished: Promise.resolve(),
      onfinish: null,
      oncancel: null,
    }) as unknown as Animation) as typeof Element.prototype.animate;
}
