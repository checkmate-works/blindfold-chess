// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

import { scrubInPlace } from '@/lib/sentry/scrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Reduce sample rate in production for performance
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Don't send events in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_ENABLE_DEV,

  // Strip PII before events leave the process. See sentry.server.config.ts
  // for the rationale — the edge runtime handles middleware and edge routes
  // and must scrub credentials identically.
  beforeSend(event, _hint) {
    if (event.request) {
      if (event.request.cookies) {
        event.request.cookies = { scrubbed: true } as unknown as typeof event.request.cookies;
      }
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.Authorization;
        delete event.request.headers.cookie;
        delete event.request.headers.Cookie;
      }
      if (event.request.data && typeof event.request.data === 'object') {
        scrubInPlace(event.request.data);
      }
    }
    return event;
  },
});
