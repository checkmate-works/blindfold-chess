import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Runtime behavior test for the dev-only console.error filter installed by
 * ThemeScript. Closes the static/runtime gap that masked the Phase 1
 * regression: the previous iteration passed lint/typecheck/build/all-tests
 * but the actual filter was bypassed by Next.js's dev-overlay
 * `intercept-console-error` race.
 *
 * This test eval()s the inline script body in JSDOM, then asserts:
 *   - calls whose first arg contains the warning fragment are dropped
 *   - other calls pass through to the underlying console.error
 *
 * The current implementation uses Object.defineProperty(console, 'error',
 * {get, set}) so that any module-load snapshot of console.error (Next's
 * dev-overlay, React's disableLogs) sees the filter, while reassignments
 * (`console.error = wrapper`) are captured as the inner forward target —
 * preserving the filter from the property slot.
 */

const ORIGINAL_DESCRIPTOR = Object.getOwnPropertyDescriptor(console, 'error');

function restoreConsoleError() {
  // Always remove whatever (possibly accessor) descriptor the IIFE installed.
  delete (console as unknown as { error?: unknown }).error;
  if (ORIGINAL_DESCRIPTOR) {
    Object.defineProperty(console, 'error', ORIGINAL_DESCRIPTOR);
  }
}

describe('ThemeScript runtime: console.error filter behavior', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.resetModules();
  });

  afterEach(() => {
    restoreConsoleError();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('drops calls whose first arg contains the warning fragment, and passes through other calls', async () => {
    const { ThemeScript } = await import('./ThemeScript');
    const { container } = render(<ThemeScript />);
    const body = container.querySelector('script')!.innerHTML;

    // Sanity-check the inline body actually contains the filter prefix —
    // if this fails, the dev branch did not load and the rest of the test
    // is meaningless.
    expect(body).toContain('Encountered a script tag while rendering');
    expect(body).toContain('Object.defineProperty');

    // Replace console.error with a spy BEFORE installing the filter, so the
    // IIFE captures the spy as both `n` (snapshot) and `i` (forward target).
    // Both filtered-drop and pass-through paths can then be observed via
    // the same spy.
    const spy = vi.fn();
    Object.defineProperty(console, 'error', {
      configurable: true,
      writable: true,
      value: spy,
    });

    // Eval the inline body. JSDOM provides Object.defineProperty + console.
    // The body contains both FILTER_SCRIPT and THEME_SCRIPT (the latter
    // touches document/localStorage/matchMedia which JSDOM also provides);
    // both are wrapped in their own try/catch so eval() is safe here.
    new Function(body)();

    // 1) Filtered: matches the warning fragment → must NOT reach the spy.
    console.error('Encountered a script tag while rendering React component');
    expect(spy).not.toHaveBeenCalled();

    // 2) Pass-through: any other string → MUST reach the spy.
    console.error('some other warning');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe('some other warning');

    // 3) Multi-arg form where first arg matches → still dropped.
    console.error('Encountered a script tag while rendering — extra context', { extra: true });
    expect(spy).toHaveBeenCalledTimes(1); // unchanged

    // 4) Non-string first arg → pass-through (filter only checks strings).
    const errObj = new Error('boom');
    console.error(errObj);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]?.[0]).toBe(errObj);
  });

  it('survives a later reassignment of console.error (defineProperty setter forwards via inner target)', async () => {
    const { ThemeScript } = await import('./ThemeScript');
    const { container } = render(<ThemeScript />);
    const body = container.querySelector('script')!.innerHTML;

    // Install with a baseline spy as the original.
    const original = vi.fn();
    Object.defineProperty(console, 'error', {
      configurable: true,
      writable: true,
      value: original,
    });

    new Function(body)();

    // Simulate Next.js dev-overlay patching: `console.error = wrapper`.
    // The defineProperty setter captures `wrapper` as the new inner target
    // without removing the filter from the property slot.
    const wrapper = vi.fn();
    console.error = wrapper;

    // Filtered call: still dropped — neither original nor wrapper called.
    console.error('Encountered a script tag while rendering');
    expect(original).not.toHaveBeenCalled();
    expect(wrapper).not.toHaveBeenCalled();

    // Pass-through call: forwarded to the new wrapper, not the original.
    console.error('after reassignment');
    expect(original).not.toHaveBeenCalled();
    expect(wrapper).toHaveBeenCalledTimes(1);
    expect(wrapper.mock.calls[0]?.[0]).toBe('after reassignment');
  });
});
