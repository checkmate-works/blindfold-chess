import '@testing-library/jest-dom';
import { vi } from 'vitest';

// `next/cache` has no runtime outside a Next server, so every test that
// touches a module using it needs the same three stubs. Declaring them here
// rather than per file is not only less typing: a local `vi.mock('next/cache')`
// REPLACES this factory wholesale, so a test that only wanted `revalidatePath`
// used to lose `unstable_cache` and fail the moment its subject reached a
// cached query — which is exactly what happened when a shared predicate grew a
// new import. `unstable_cache` passes the function straight through because
// the tests care what the query returns, not that it was memoized.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// `server-only` exists to make a build fail when a server module is pulled
// into a client bundle. Under vitest there is no such boundary, so importing
// it would just throw — every test that touched a server module needed this
// no-op, and 71 of them declared it themselves, identically. There is no test
// that would want a different stub: the package has no runtime behaviour.
vi.mock('server-only', () => ({}));

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
