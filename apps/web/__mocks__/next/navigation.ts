import { vi } from 'vitest';

/**
 * `next/navigation`'s control-flow functions, stubbed so they still behave like
 * control flow.
 *
 * Opt in with a bare `vi.mock('next/navigation')`.
 *
 * `redirect`, `permanentRedirect` and `notFound` do not return in Next — they
 * throw, and the framework catches it. A stub that merely records the call lets
 * the code under test keep running past the point where production would have
 * stopped, so a Server Action would go on to return a value it never returns in
 * reality. Twenty-one tests each rediscovered that and wrote their own throwing
 * stub; the sentinel message is arbitrary and none of them assert on it, since
 * the call arguments are what carries the destination.
 *
 * Tests that need the router hooks keep their own factory: what `useRouter`
 * should return is per-test, and a shared default would be a stub nobody asked
 * for.
 */
export const redirect = vi.fn((_url: string): never => {
  throw new Error('NEXT_REDIRECT');
});

export const permanentRedirect = vi.fn((_url: string): never => {
  throw new Error('NEXT_REDIRECT');
});

export const notFound = vi.fn((): never => {
  throw new Error('NEXT_NOT_FOUND');
});
