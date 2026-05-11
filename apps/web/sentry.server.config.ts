// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% trace sampling in production to bound Sentry's per-request overhead
  // (instrumentation CPU on every Function invocation, plus egress to the
  // Sentry SaaS for each emitted transaction). Mirrors `sentry.edge.config.ts`.
  // `captureException` runs on a separate path and is unaffected — error
  // events are still delivered at 100%.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Don't send events in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_ENABLE_DEV,
});
