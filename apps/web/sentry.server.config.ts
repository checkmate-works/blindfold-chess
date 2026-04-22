// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

import { scrubInPlace } from '@/lib/sentry/scrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Don't send events in development unless explicitly enabled
  enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_ENABLE_DEV,

  // Strip PII before events leave the process. Sentry's Next.js integration
  // attaches the request URL / headers / body to server-side exceptions, and
  // password-related Server Actions (changePassword, resetPassword, ...)
  // would otherwise leak plaintext credentials via `event.request.data`.
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
