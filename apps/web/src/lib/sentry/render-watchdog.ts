import { cache } from 'react';

import { after } from 'next/server';

import * as Sentry from '@sentry/nextjs';

/**
 * How long a server render may run before it counts as stuck. Chosen to sit
 * well below the route segments' `maxDuration = 60`, so the report is sent and
 * flushed long before the platform kills the invocation.
 */
const WATCHDOG_MS = 20_000;

/** Deadline for delivering the report; short, since the render is doomed anyway. */
const FLUSH_TIMEOUT_MS = 2_000;

/**
 * Stage of the render, held per request. `cache()` scopes the object to one
 * render pass, so a component deep in the tree can advance the stage without
 * the watchdog being threaded through props.
 */
const getRenderStage = cache(() => ({ current: 'entered' }));

/**
 * Record that the render reached `stage`. No-op unless
 * {@link startRenderWatchdog} armed a watchdog for this request.
 *
 * Call it right after an await completes, naming what just finished — the
 * value reported is the last stage reached, i.e. the boundary the render did
 * not get past.
 */
export function markRenderStage(stage: string): void {
  getRenderStage().current = stage;
}

/**
 * Report to Sentry if this server render has not finished within
 * {@link WATCHDOG_MS}, naming the last stage {@link markRenderStage} recorded.
 *
 * @design Why a watchdog inside the render is the only instrument left
 * Production stalls where a `<Link>` navigation commits, paints `loading.tsx`,
 * and never renders leave no evidence anywhere else:
 *
 * - Vercel does not record a duration for an invocation it killed, and the
 *   per-function breakdown that might show one is a paid add-on.
 * - A Sentry *transaction* is only sent when its span ends, so a render that
 *   is killed mid-flight is never reported regardless of `tracesSampleRate`.
 * - React's own `The destination stream closed early.` is logged on abort and
 *   is not flushed when the process is killed outright.
 *
 * Every observer downstream of the failure dies with it. So the render has to
 * report on itself, from inside, before the kill — which is what this does.
 *
 * @design What the reported stage decides
 * The stall has been narrowed to renders that produce a Flight stream: the
 * same page, requested as a document (address bar), renders immediately. That
 * leaves two candidates, and the stage tells them apart:
 *
 * - a stage before the page returned → an `await` in this app's own code is
 *   what never settles, and the stage names which one
 * - the final stage (everything of ours resolved) → our work finished and
 *   React never completed the stream, which is a framework bug and the
 *   evidence to report upstream
 * - *no event at all* → the render never started; the hang is above this app,
 *   in routing or the proxy
 *
 * The timer is cleared from {@link after}, which runs once the response has
 * finished streaming — so a healthy render, however slow, never reports, and
 * only a response that never completes leaves the timer to fire.
 */
export function startRenderWatchdog(name: string, context?: Record<string, unknown>): void {
  // Resolved here, during the render, because `cache()` cannot be read from
  // the timer callback — that runs after the render context is gone. Arming
  // resets the stage, so the holder can never carry a value in from anywhere
  // that shares its cache scope.
  const stage = getRenderStage();
  stage.current = 'entered';

  const timer = setTimeout(() => {
    Sentry.captureMessage(`render-watchdog:${name}`, {
      level: 'warning',
      extra: { stage: stage.current, thresholdMs: WATCHDOG_MS, ...context },
    });
    void Sentry.flush(FLUSH_TIMEOUT_MS);
  }, WATCHDOG_MS);

  after(() => clearTimeout(timer));
}
