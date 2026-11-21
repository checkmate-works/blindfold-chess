'use client';

import { type ReactNode, createContext, useContext } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { ChallengeMenuType } from '@blindfold-chess/features/practice-registry';

import { type ChallengeAttemptReady, useChallengeAttempt } from '../_hooks/use-challenge-attempt';

/**
 * True below a {@link ChallengeAttemptGate}: the subtree is a challenge run,
 * which cannot be paused. Shared components that also serve training and the
 * unranked quadrant drill (`ChallengeStatusHeader`) read this instead of
 * taking a prop, so the views in between do not have to thread one through.
 */
const ChallengeAttemptContext = createContext(false);

/** Whether the caller renders inside a challenge run (see {@link ChallengeAttemptGate}). */
export function useIsInChallengeAttempt(): boolean {
  return useContext(ChallengeAttemptContext);
}

type Props<TQuestion> = {
  menuType: ChallengeMenuType;
  /** Sent to `beginChallengeAttempt`; must pass the module's `parseSettings`. */
  settings: unknown;
  /** The screen's own play skeleton, shown while the attempt is being started. */
  fallback: ReactNode;
  /**
   * The session body. Rendered only once the attempt is settled, so the
   * session hook inside mounts with its `remote` port already in hand.
   */
  children: (attempt: ChallengeAttemptReady<TQuestion>) => ReactNode;
};

/**
 * Starts the challenge attempt and mounts the session only once it exists.
 *
 * The session hook must not mount above this gate: it builds its first
 * question on mount, so mounting it before the start has answered would put a
 * device-generated question on screen that the server never issued. A start
 * that fails shows an error with a retry instead of the session — a signed-in
 * player is told now that the run could not be recorded, not after playing it.
 * (A start refused because of the account — no server session, a ban — does
 * not reach this error: the hook settles it as a device-only run.)
 * A start refused by the rate limit gets its own message: the connection is
 * fine and an immediate retry cannot succeed, so the generic "check your
 * connection" would send the player looking for a fault that is not there.
 */
export function ChallengeAttemptGate<TQuestion>({
  menuType,
  settings,
  fallback,
  children,
}: Props<TQuestion>) {
  const attempt = useChallengeAttempt<TQuestion>(menuType, settings);
  const t = useTranslations('practice.challengeAttempt');

  if (attempt.status === 'loading') return <>{fallback}</>;

  if (attempt.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <p className="text-foreground">
          {t(attempt.reason === 'rateLimited' ? 'startRateLimited' : 'startFailed')}
        </p>
        <Button variant="primary" onClick={attempt.retry}>
          {t('retry')}
        </Button>
      </div>
    );
  }

  const ready: ChallengeAttemptReady<TQuestion> =
    attempt.attemptId === null
      ? { attemptId: null, remote: undefined }
      : { attemptId: attempt.attemptId, remote: attempt.remote };

  return (
    <ChallengeAttemptContext.Provider value={true}>
      {children(ready)}
    </ChallengeAttemptContext.Provider>
  );
}

/**
 * Locks the question area while a server-run session waits for its next
 * question (`awaitingServer`): pointer input is off and the area is marked
 * `aria-busy`. Nothing about its look changes. The answered question is still
 * mounted then while the clock runs, and what keeps the player from reading
 * it as the live question is its feedback, which `useTimedSession` keeps up
 * (`showFeedback`) until the next question replaces it.
 *
 * It used to blur and grey the area out as well. The wait lasts from a few
 * frames to a few hundred milliseconds on every answer, so the question
 * blinked out and back after each one; changing the screen once, from the
 * feedback straight to the next question, does not.
 */
export function AwaitingServerInputLock({
  active,
  className = '',
  children,
}: {
  active: boolean;
  className?: string;
  children: ReactNode;
}) {
  const lock = active ? 'pointer-events-none' : '';
  return (
    <div aria-busy={active || undefined} className={`${lock} ${className}`.trim()}>
      {children}
    </div>
  );
}
