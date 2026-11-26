import { useCallback, useEffect, useRef, useState } from "react";
import type { RemoteChallengePort } from "@blindfold-chess/features/challenge-attempt";
import { getChallengeModule } from "@blindfold-chess/features/challenge-attempt/modules";
import { challengeKey } from "@blindfold-chess/features/dojo-journey";
import type { ChallengeMenuType } from "@blindfold-chess/features/practice-registry";

import { useAuth } from "../../auth/use-auth";
import { beginChallenge } from "./challenge-api";

export type ChallengeAttempt<Q> =
  | { attemptId: string; remote: RemoteChallengePort<Q> }
  | { attemptId: null; remote: undefined };

export type ChallengeAttemptState<Q> =
  | { status: "loading" }
  | ({ status: "ready" } & ChallengeAttempt<Q>)
  | { status: "error"; reason: "rateLimited" | "failed"; retry: () => void };

const UNRECORDED = {
  status: "ready",
  attemptId: null,
  remote: undefined,
} as const;

/**
 * The leaderboard (`<menuType>:<leaderboardKey>`) of the signed-out run in
 * progress, if any. The run is decided here, where its settings are known;
 * whether it ends is only known when its result screen shows, which reads
 * this through {@link takeSignedOutRunKey}.
 */
let signedOutRunKey: string | undefined;

function leaderboardOf(
  menuType: ChallengeMenuType,
  settings: unknown,
): string | undefined {
  const definition = getChallengeModule(menuType);
  const parsed = definition?.parseSettings(settings);
  if (!definition || parsed === null || parsed === undefined) return undefined;
  return challengeKey(menuType, definition.leaderboardKey(parsed));
}

/**
 * The signed-out run that just reached its result, handed over once: a
 * second call (the result screen re-rendering, or another result screen
 * later) gets nothing until another signed-out run starts.
 */
export function takeSignedOutRunKey(): string | undefined {
  const key = signedOutRunKey;
  signedOutRunKey = undefined;
  return key;
}

/**
 * Decides once, before the session starts, whether this run is recorded:
 * signed in → a server attempt (questions and grading from the server);
 * signed out, banned, or no backend → a local run. A failed start offers a
 * retry rather than silently dropping to unrecorded, so a signed-in player
 * never plays a run they think counts but does not.
 */
export function useChallengeAttempt<Q>(
  menuType: ChallengeMenuType,
  settings: unknown,
): ChallengeAttemptState<Q> {
  const auth = useAuth();
  const [state, setState] = useState<ChallengeAttemptState<Q>>({
    status: "loading",
  });
  const [token, setToken] = useState(0);
  const settled = useRef(false);
  const settingsRef = useRef(settings);

  const retry = useCallback(() => {
    settled.current = false;
    setState({ status: "loading" });
    setToken((t) => t + 1);
  }, []);

  const authResolved = auth.status !== "loading";
  const signedIn = auth.status === "signedIn";
  useEffect(() => {
    if (settled.current || !authResolved) return;
    if (!signedIn) {
      settled.current = true;
      signedOutRunKey = leaderboardOf(menuType, settingsRef.current);
      setState(UNRECORDED);
      return;
    }
    signedOutRunKey = undefined;
    let cancelled = false;
    void beginChallenge<Q>(menuType, settingsRef.current).then((result) => {
      if (cancelled) return;
      if (result.kind === "error") {
        setState({ status: "error", reason: result.reason, retry });
        return;
      }
      settled.current = true;
      setState(
        result.kind === "recorded"
          ? {
              status: "ready",
              attemptId: result.attemptId,
              remote: result.remote,
            }
          : UNRECORDED,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [authResolved, signedIn, menuType, token, retry]);

  return state;
}
