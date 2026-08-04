'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

/** How long a loading boundary may stay on screen before it counts as stuck. */
const STALL_THRESHOLD_MS = 15_000;

type Props = {
  /** Which boundary this is (e.g. 'profile-shell'). Used to group in Sentry. */
  boundary: string;
};

/**
 * Detects a navigation that commits and then never renders. Mount it in a
 * `loading.tsx`.
 *
 * @design Why a timer is the detector
 * Production was observed (2026-08-05) getting permanently stuck after a soft
 * navigation: the URL committed, the skeleton painted, and rendering the new
 * tree then died with React #310 inside the App Router itself. Only a manual
 * reload recovered it, and the failure reported nothing on its own — the #310
 * that reached Sentry was incidental, so counting those cannot tell us whether
 * the failure is still happening. A skeleton is only ever on screen for a few
 * seconds, so outliving a threshold is itself the symptom. Unmount clears the
 * timer, so a normal load sends nothing. The threshold is set well above the
 * worst legitimate load (cold start on a slow connection).
 *
 * @design What this is here to decide
 * The failure only reproduces in the production streaming environment, so no
 * local check can confirm whether the Next.js 16.3.0 upgrade (same day) fixed
 * it. The verdict is whether these events drop to zero after deploy; if they
 * do not, they are the evidence for an upstream report.
 *
 * Read a zero carefully. It means no stall *of the observed shape* — one where
 * the skeleton stays mounted, which is what keeps this effect alive to fire. A
 * failure that instead tears down the React root would take the timer with it
 * and report nothing.
 *
 * `deploymentId` only carries a value once Vercel Skew Protection (or
 * `deploymentId` in next.config) is enabled. After that it can be matched
 * against the `x-nextjs-deployment-id` response header to tell a tab holding a
 * stale bundle (deployment skew) apart from the framework bug. It is unset for
 * now, hence null — that does not change what the report means, so a missing
 * value is never a reason to withhold one.
 */
export function LoadingStallReporter({ boundary }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      Sentry.captureMessage(`loading-boundary-stalled:${boundary}`, {
        level: 'warning',
        extra: {
          pathname: window.location.pathname,
          deploymentId: (globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? null,
          thresholdMs: STALL_THRESHOLD_MS,
        },
      });
    }, STALL_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [boundary]);

  return null;
}
