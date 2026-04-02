// This file configures the initialization of Sentry on the client side.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Reduce sample rate in production for performance
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Don't send events in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV,

  // Replay configuration
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes here
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

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
