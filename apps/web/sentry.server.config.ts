// This file configures the initialization of Sentry on the server side.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
import * as Sentry from '@sentry/nextjs';

import type { QueryDeadlineDiagnostics } from '@/lib/db/query-deadline';
import { scrubRequestInPlace } from '@/lib/sentry/scrub';

/**
 * Find a `QueryDeadlineError`'s diagnostics anywhere in an error's `cause`
 * chain. Drizzle wraps the deadline rejection in its own `Failed query` error,
 * so the interesting object is usually one `cause` deep. Matched by name, not
 * `instanceof` — bundling can duplicate the class across chunks.
 */
function findQueryDeadlineDiagnostics(error: unknown): QueryDeadlineDiagnostics | undefined {
  for (let cursor = error, depth = 0; cursor && depth < 5; depth += 1) {
    const candidate = cursor as { name?: unknown; diagnostics?: unknown; cause?: unknown };
    if (candidate.name === 'QueryDeadlineError' && typeof candidate.diagnostics === 'object') {
      return candidate.diagnostics as QueryDeadlineDiagnostics;
    }
    cursor = candidate.cause;
  }
  return undefined;
}

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

  // Strip PII before events leave the process. Sentry's Next.js integration
  // attaches the request URL / headers / body to server-side exceptions, and
  // password-related Server Actions (changePassword, resetPassword, ...)
  // would otherwise leak plaintext credentials via `event.request.data`.
  /* eslint-disable no-param-reassign -- Sentry's beforeSend contract is mutate-in-place: the hook edits the event it is handed, and returning a copy would drop the fields Sentry attaches after it runs. */
  beforeSend(event, hint) {
    // Surface a query deadline's where-did-the-time-go numbers as searchable
    // tags: overshoot in the seconds = this instance's event loop was blocked
    // (the DB is innocent); overshoot ≈ 0 = the query truly went unanswered
    // (pool queue / pooler / network / execution). See
    // `@/lib/db/query-deadline` for the full decision table.
    const diagnostics = findQueryDeadlineDiagnostics(hint?.originalException);
    if (diagnostics) {
      event.tags = {
        ...event.tags,
        'query_deadline.overshoot_ms': String(Math.round(diagnostics.overshootMs)),
        'query_deadline.inflight_count': String(diagnostics.inflightCount),
        // Age of the oldest other unsettled query. Far past the 10s deadline
        // means a wedged pool slot; the full list is in the extra below.
        'query_deadline.oldest_inflight_ms': String(diagnostics.inflightOldest[0]?.ageMs ?? 0),
      };
      event.extra = {
        ...event.extra,
        // SQL text only, never parameters — same privacy line as the error
        // message itself.
        'query_deadline.inflight_oldest': diagnostics.inflightOldest,
      };
    }

    scrubRequestInPlace(event);
    return event;
  },
});
