'use client';

import { useEffect } from 'react';

import * as Sentry from '@sentry/nextjs';

/** How long a loading boundary may stay on screen before it counts as stuck. */
const STALL_THRESHOLD_MS = 15_000;

/** Deadline for delivering the report before the reload tears the page down. */
const FLUSH_TIMEOUT_MS = 2_000;

/**
 * How many times a path may reload itself out of a stall, per tab.
 *
 * More than one because recovery is not guaranteed: a stall lasts on the order
 * of half a minute, and a reload issued inside that window can land right back
 * on whatever is wedged. Few enough that a genuinely broken route costs the
 * user a bounded wait rather than an endless reload loop.
 */
const MAX_RECOVERY_ATTEMPTS = 2;

const recoveryKey = (pathname: string) => `bfc:stall-recovered:${pathname}`;

/**
 * Count the attempt and report whether this one may reload.
 *
 * Storage can be unavailable (Safari private mode, blocked cookies). A failed
 * read or write means no reload: without a counter there is nothing to stop a
 * loop, and one manual reload is a far better failure than an endless one.
 */
function claimRecoveryAttempt(pathname: string): boolean {
  try {
    const attempts = Number(sessionStorage.getItem(recoveryKey(pathname)) ?? '0');
    if (attempts >= MAX_RECOVERY_ATTEMPTS) return false;
    sessionStorage.setItem(recoveryKey(pathname), String(attempts + 1));
    return true;
  } catch {
    return false;
  }
}

type Props = {
  /** Which boundary this is (e.g. 'profile-shell'). Used to group in Sentry. */
  boundary: string;
};

/**
 * Detects a navigation that commits and then never renders, reports it, and
 * reloads once to get the user out. Mount it in a `loading.tsx`.
 *
 * @design Why a timer is the detector
 * Production was observed (2026-08) getting permanently stuck after a soft
 * navigation: the URL committed, the skeleton painted, and the body never
 * arrived. Only a manual reload recovered it, and the failure reported nothing
 * on its own. A skeleton is only ever on screen for a few seconds, so
 * outliving a threshold is itself the symptom. Unmount clears the timer, so a
 * normal load sends nothing. The threshold is set well above the worst
 * legitimate load (cold start on a slow connection).
 *
 * @design Why it reloads, and why that is a bet rather than a fix
 * A stuck render never recovers on its own — it holds the skeleton until the
 * platform kills the invocation. A fresh request is the only way out, and one
 * issued a little later does succeed: whatever wedges is transient, on the
 * order of half a minute, and is not shared by every request (other routes
 * keep answering throughout). Reloading buys a fresh roll of that dice.
 *
 * It is a bet, not a guarantee: a reload issued while the stall is still on
 * can land right back on it, which is why {@link MAX_RECOVERY_ATTEMPTS}
 * allows more than one. Nothing is risked by trying — a loading boundary means
 * the destination never rendered, so there is no state on screen to discard.
 *
 * @design What a report still decides
 * Reporting stays the point: `recovering` separates a first stall from one
 * that survived a reload — a run of `recovering: false` means reloading is not
 * buying anything and the assumption above is wrong. The server-side
 * `render-watchdog:*` event for the same navigation names the stage the render
 * died at. See `startRenderWatchdog` and the navigation-stall entry in
 * CLAUDE.md's Known Issues.
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
      const pathname = window.location.pathname;
      const recovering = claimRecoveryAttempt(pathname);

      Sentry.captureMessage(`loading-boundary-stalled:${boundary}`, {
        level: 'warning',
        extra: {
          pathname,
          deploymentId: (globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? null,
          thresholdMs: STALL_THRESHOLD_MS,
          recovering,
        },
      });

      if (!recovering) return;

      // Deliver the report first — the reload discards anything still queued.
      void Sentry.flush(FLUSH_TIMEOUT_MS).finally(() => {
        window.location.reload();
      });
    }, STALL_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [boundary]);

  return null;
}
