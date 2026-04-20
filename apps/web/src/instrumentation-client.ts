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

// Names of default integrations that exist solely for performance tracing /
// session tracking. The app only uses Sentry for error capture
// (captureException / captureMessage), so these add bundle weight and
// runtime cost without being consumed. Removing them from the client SDK
// trims the shared vendor chunk and eliminates the PerformanceObservers
// that BrowserTracing and ElementTiming install at boot.
//
// Server-side Sentry (`sentry.server.config.ts` / `sentry.edge.config.ts`)
// is intentionally left untouched — those bundles are not shipped to the
// browser, and server-side traces are cheap.
const PERF_ONLY_INTEGRATION_NAMES = new Set(['BrowserTracing', 'BrowserSession', 'ElementTiming']);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Don't send events in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV,

  // Drop performance-tracing integrations from the client SDK. We keep
  // error-capture integrations (global handlers, linked errors, dedupe,
  // breadcrumbs, etc.) so `Sentry.captureException` / `captureMessage`
  // behave unchanged. `tracesSampleRate` is also omitted so no spans are
  // ever sampled / transmitted from the browser.
  integrations: (defaultIntegrations) =>
    defaultIntegrations.filter((integration) => !PERF_ONLY_INTEGRATION_NAMES.has(integration.name)),

  // Session Replay integration removed on 2026-04-13.
  // Sentry's replay quota was exhausted, so replays were not actually
  // being captured (the UI showed "The replay associated with this
  // event cannot be found"). Dropping replayIntegration trims the
  // client bundle accordingly. If re-enabling, review the replay quota first.
  //
  // BrowserTracing / BrowserSession / ElementTiming integrations removed
  // on 2026-04-19 (audit F-002). The app only uses Sentry for error
  // capture; performance-tracing integrations added ~130 KB Brotli to the
  // shared vendor chunk and hurt LCP/TBT on every page.

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
