// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

// ---------------------------------------------------------------------------
// Suppress "Recoverable Error" dev overlay for known HMR-related SSR failures
// ---------------------------------------------------------------------------
// During HMR triggered by .env.local changes, Turbopack may reload modules
// before NextIntlClientProvider is re-established. This causes SSR to fail
// with "No intl context found", which React reports as a Recoverable Error
// and Next.js renders as a dev overlay — even though the page works fine
// after client-side fallback.
//
// Next.js does not expose an `onRecoverableError` option for `hydrateRoot`,
// so we monkey-patch `ReactDOM.hydrateRoot` to inject a custom handler that
// downgrades matching errors to `console.warn` instead of `reportError`.
//
// This patch runs **only in development** and has zero impact on production.
// See: https://github.com/vercel/next.js/discussions/36641
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'development') {
  /**
   * Error messages (substrings) that should be silently downgraded from the
   * dev overlay to console.warn. Add new patterns here as needed.
   */
  const SUPPRESSED_RECOVERABLE_ERRORS: string[] = ['No intl context found', 'NEXT_INTL_CONTEXT'];

  function shouldSuppressRecoverableError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    return SUPPRESSED_RECOVERABLE_ERRORS.some((pattern) => message.includes(pattern));
  }

  try {
    // Dynamic import so this never ends up in production bundles
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ReactDOM = require('react-dom/client');
    const originalHydrateRoot = ReactDOM.hydrateRoot;

    if (typeof originalHydrateRoot === 'function') {
      ReactDOM.hydrateRoot = function patchedHydrateRoot(
        container: Element | Document,
        initialChildren: React.ReactNode,
        options?: Record<string, unknown>
      ) {
        const userOnRecoverableError = options?.onRecoverableError as
          | ((error: unknown, errorInfo: unknown) => void)
          | undefined;

        const patchedOptions = {
          ...options,
          onRecoverableError(error: unknown, errorInfo: unknown) {
            if (shouldSuppressRecoverableError(error)) {
              console.warn(
                '[dev] Suppressed recoverable error (HMR-related):',
                error instanceof Error ? error.message : error
              );
              return;
            }
            // Delegate to the original handler (Next.js's own or user-provided)
            if (typeof userOnRecoverableError === 'function') {
              userOnRecoverableError(error, errorInfo);
            } else {
              // React's default behaviour: reportError
              if (typeof reportError === 'function') {
                reportError(error);
              } else {
                console.error(error);
              }
            }
          },
        };

        return originalHydrateRoot.call(this, container, initialChildren, patchedOptions);
      };
    }
  } catch {
    // Silently ignore — if react-dom/client cannot be loaded, no patch needed
  }
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Reduce sample rate in production for performance
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Don't send events in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV,

  // Session Replay integration removed on 2026-04-13.
  // Sentry's replay quota was exhausted, so replays were not actually
  // being captured (the UI showed "The replay associated with this
  // event cannot be found"). Dropping replayIntegration trims the
  // client bundle accordingly. If re-enabling, review the replay quota first.

  // Filter out known errors that are not actionable
  beforeSend(event, hint) {
    // Ignore ResizeObserver errors (common browser issue)
    if (
      hint.originalException &&
      hint.originalException instanceof Error &&
      hint.originalException.message?.includes('ResizeObserver')
    ) {
      return null;
    }

    // Ignore Next.js router aborted errors
    if (
      hint.originalException &&
      typeof hint.originalException === 'object' &&
      'name' in hint.originalException &&
      hint.originalException.name === 'AbortError'
    ) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
