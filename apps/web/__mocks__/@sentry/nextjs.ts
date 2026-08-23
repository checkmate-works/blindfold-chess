import { vi } from 'vitest';

/**
 * Sentry's capture surface, stubbed to record instead of report.
 *
 * Opt in with a bare `vi.mock('@sentry/nextjs')`.
 *
 * Every error path that reports to Sentry drags the SDK into the test, which
 * wants a DSN and a transport. Twelve files replaced it with a factory
 * exporting one or two `vi.fn()`s; this is the union, so a test that only
 * declared `captureException` still behaves the same and one that later starts
 * calling `captureMessage` gets a spy rather than `undefined is not a function`.
 *
 * Read the calls back with `vi.mocked(captureException)` — the hoisted-spy
 * indirection those factories used exists only because an inline factory cannot
 * close over a `const` declared below it, which is not a constraint here.
 *
 * `withSentryConfig` is a build-time wrapper, not a capture function; the two
 * next.config tests that stub it keep their own factory.
 */
export const captureException = vi.fn();
export const captureMessage = vi.fn();
export const captureEvent = vi.fn();
export const setContext = vi.fn();
export const setTag = vi.fn();
