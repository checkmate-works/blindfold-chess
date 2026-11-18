import '@testing-library/jest-dom';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { vi } from 'vitest';

// The import above registers the jest-dom matchers at runtime, but their
// types only reach the global `jest.Matchers` interface, and Vitest 5 stopped
// reading custom matchers from there. jest-dom's own `/vitest` entry does not
// help either: it augments `Assertion<T>`, while Vitest 5's `Assertion` takes
// `<R, T>` (R is `void` for a plain assertion, `Promise<void>` behind
// `.resolves` / `.rejects`). Augmenting `Matchers<R, T>` is what Vitest 5
// documents for custom matchers; it reaches `expect(...)`, asymmetric
// matchers, and `expect.extend` at once. The type parameters must repeat
// Vitest's declaration exactly or the interfaces do not merge. Delete this
// block once jest-dom ships Vitest 5 typings.
declare module 'vitest' {
  /* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type --
     an augmentation adds members through `extends`, so the body is empty, and
     T is unused but must be declared for the merge with Vitest's Matchers<R, T> */
  interface Matchers<
    R extends void | Promise<void> = void | Promise<void>,
    T = unknown,
  > extends TestingLibraryMatchers<unknown, R> {}
  /* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
}

// `next/cache` has no runtime outside a Next server, so every test that
// touches a module using it needs the same three stubs. Declaring them here
// rather than per file is not only less typing: a local `vi.mock('next/cache')`
// REPLACES this factory wholesale, so a test that only wanted `revalidatePath`
// used to lose `unstable_cache` and fail the moment its subject reached a
// cached query — which is exactly what happened when a shared predicate grew a
// new import. `unstable_cache` passes the function straight through because
// the tests care what the query returns, not that it was memoized.
//
// Twenty-six files were declaring one anyway, each keeping whichever one or
// two of the three it happened to need. Do not add another: reach the spies
// with `import { revalidateTag } from 'next/cache'`, which `clearMocks`
// resets between tests like any other.
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
